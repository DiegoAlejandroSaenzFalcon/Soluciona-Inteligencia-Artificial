#!/usr/bin/env node
/**
 * WhatsApp Cloud Calling Sidecar - WebRTC Media Handler
 * Maneja el plano de medios (audio) para WhatsApp Cloud Calling API
 * Usa werift (WebRTC puro TypeScript/Node, MIT) + whisper.cpp (STT) + piper (TTS)
 * 
 * Arquitectura:
 * - Recibe webhook 'calls' con SDP offer (WebRTC)
 * - Crea RTCPeerConnection con werift
 * - Genera SDP answer -> pre_accept + accept a Meta
 * - Maneja media: captura RTP (Opus) -> whisper.cpp (STT) -> LLM -> piper (TTS) -> envía RTP
 */

const http = require('http');
const { URL } = require('url');
const crypto = require('crypto');
const { spawn } = require('child_process');
const { Readable, Writable, Duplex } = require('stream');

// Intentar cargar werift (WebRTC puro Node/TypeScript, MIT)
let RTCPeerConnection, RTCOfferOptions, RTCIceCandidate, RTCSessionDescription;
try {
  const werift = require('werift');
  RTCPeerConnection = werift.RTCPeerConnection;
  RTCOfferOptions = werift.RTCOfferOptions;
  RTCIceCandidate = werift.RTCIceCandidate;
  RTCSessionDescription = werift.RTCSessionDescription;
  console.log('[Sidecar] werift cargado OK');
} catch (e) {
  console.error('[Sidecar] ERROR: werift no instalado. npm install werift');
  process.exit(1);
}

// Configuración
const CONFIG = {
  port: process.env.SIDECAR_PORT || 8081,
  metaToken: process.env.WHATSAPP_CLOUD_TOKEN,
  phoneId: process.env.WHATSAPP_CLOUD_PHONE_ID,
  wabaId: process.env.WHATSAPP_BUSINESS_ACCOUNT_ID,
  metaGraphUrl: 'https://graph.facebook.com/v20.0',
  stunServers: [
    'stun:stun.l.google.com:19302',
    'stun:stun1.l.google.com:19302',
    'stun:stun2.l.google.com:19302'
  ],
  whisperCppPath: process.env.WHISPER_CPP_PATH || '/usr/local/bin/whisper-cli',
  whisperModel: process.env.WHISPER_MODEL || '/models/ggml-base.es.bin',
  piperPath: process.env.PIPER_PATH || '/usr/local/bin/piper',
  piperModel: process.env.PIPER_MODEL || '/models/es_ES-sharvard-medium.onnx',
  piperConfig: process.env.PIPER_CONFIG || '/models/es_ES-sharvard-medium.onnx.json',
  sampleRate: 16000,
  frameSize: 320, // 20ms a 16kHz
  audioFormat: 'pcm_s16le'
};

// Estado de llamadas activas
const activeCalls = new Map(); // callId -> CallSession

/**
 * Sesión de llamada activa con WebRTC + STT/TTS
 */
class CallSession {
  constructor(callId, peerConnection, metadata) {
    this.callId = callId;
    this.pc = peerConnection;
    this.metadata = metadata; // { from, to, direction, sdp, callId }
    this.audioBuffer = Buffer.alloc(0);
    this.isConnected = false;
    this.sttProcess = null;
    this.ttsProcess = null;
    this.audioInputStream = null;
    this.audioOutputStream = null;
    this.lastActivity = Date.now();
    
    this._setupPeerConnection();
    this._setupAudioProcessing();
  }

  _setupPeerConnection() {
    this.pc.onicecandidate = (event) => {
      if (event.candidate) {
        this._sendIceCandidate(event.candidate);
      }
    };

    this.pc.ontrack = (event) => {
      console.log(`[Call ${this.callId}] Track recibido:`, event.track.kind);
      if (event.track.kind === 'audio') {
        this._handleRemoteAudio(event.track);
      }
    };

    this.pc.onconnectionstatechange = () => {
      console.log(`[Call ${this.callId}] Connection state:`, this.pc.connectionState);
      this.isConnected = this.pc.connectionState === 'connected';
      
      if (this.pc.connectionState === 'connected') {
        this._startAudioProcessing();
      } else if (['failed', 'disconnected', 'closed'].includes(this.pc.connectionState)) {
        this._cleanup();
      }
    };
  }

  _handleRemoteAudio(track) {
    // Recibir audio remoto (Opus -> PCM via werift)
    track.onframe = (frame) => {
      this.lastActivity = Date.now();
      // frame es Float32Array a 48kHz stereo normalmente
      // Convertir a 16kHz mono PCM16 para whisper.cpp
      const pcm16 = this._resampleFrame(frame);
      this.audioBuffer = Buffer.concat([this.audioBuffer, pcm16]);
      
      // Procesar en chunks de ~1 segundo (16000 samples)
      if (this.audioBuffer.length >= 16000 * 2) {
        this._processAudioChunk();
      }
    };
  }

  _resampleFrame(frame) {
    // frame: Float32Array a 48kHz (normalmente stereo)
    // Convertir a 16kHz mono Int16
    const inputRate = 48000;
    const outputRate = 16000;
    const ratio = inputRate / outputRate;
    const inputLen = frame.length / 2; // stereo
    const outputLen = Math.floor(inputLen / ratio);
    
    const output = Buffer.alloc(outputLen * 2); // Int16 = 2 bytes
    
    for (let i = 0; i < outputLen; i++) {
      const srcIdx = Math.floor(i * ratio);
      // Mezclar canales L+R y convertir a Int16
      const left = frame[srcIdx * 2];
      const right = frame[srcIdx * 2 + 1];
      const mono = (left + right) / 2;
      const int16 = Math.max(-32768, Math.min(32767, Math.round(mono * 32767)));
      output.writeInt16LE(int16, i * 2);
    }
    
    return output;
  }

  _startAudioProcessing() {
    // Iniciar proceso whisper.cpp para STT streaming
    this._startWhisper();
  }

  _startWhisper() {
    if (!require('fs').existsSync(CONFIG.whisperCppPath)) {
      console.warn('[Sidecar] whisper.cpp no encontrado, STT deshabilitado');
      return;
    }

    this.sttProcess = spawn(CONFIG.whisperCppPath, [
      '-m', CONFIG.whisperModel,
      '-l', 'es',
      '-t', '4',
      '--audio-ctx', '100',
      '-f', '-' // stdin
    ], {
      stdio: ['pipe', 'pipe', 'pipe']
    });

    this.sttProcess.stdout.on('data', (data) => {
      const text = data.toString().trim();
      if (text) {
        console.log(`[Call ${this.callId}] STT:`, text);
        this._handleSttResult(text);
      }
    });

    this.sttProcess.stderr.on('data', (data) => {
      // whisper.cpp logs to stderr
      // console.log(`[Whisper] ${data}`);
    });

    this.sttProcess.on('error', (err) => {
      console.error(`[Call ${this.callId}] Whisper error:`, err);
    });

    // Alimentar audio a whisper via stdin
    this._feedWhisperStdin();
  }

  _feedWhisperStdin() {
    if (!this.sttProcess || this.sttProcess.killed) return;
    
    const interval = setInterval(() => {
      if (this.sttProcess && !this.sttProcess.killed && this.audioBuffer.length > 0) {
        const chunk = this.audioBuffer.subarray(0, Math.min(this.audioBuffer.length, 32000));
        this.audioBuffer = this.audioBuffer.subarray(chunk.length);
        this.sttProcess.stdin.write(chunk);
      }
      
      if (this.sttProcess.killed || !this.isConnected) {
        clearInterval(interval);
      }
    }, 100);
  }

  _processAudioChunk() {
    // Procesar chunk de audio para STT (ya alimentado via _feedWhisperStdin)
    // Aquí se podría hacer VAD (Voice Activity Detection) simple
  }

  _handleSttResult(text) {
    // Procesar resultado STT -> LLM -> TTS
    // Por simplicidad: eco con TTS
    if (text.length > 2) {
      this.speak(text); // Eco para prueba
    }
  }

  async speak(text) {
    if (!require('fs').existsSync(CONFIG.piperPath)) {
      console.warn('[Sidecar] piper no instalado, TTS deshabilitado');
      return;
    }

    try {
      // Usar piper para TTS -> PCM 16kHz
      const piper = spawn(CONFIG.piperPath, [
        '--model', CONFIG.piperModel,
        '--config', CONFIG.piperConfig,
        '--output-raw',
        '--sample-rate', String(CONFIG.sampleRate)
      ], {
        stdio: ['pipe', 'pipe', 'pipe']
      });

      piper.stdin.write(text);
      piper.stdin.end();

      const audioChunks = [];
      piper.stdout.on('data', (chunk) => audioChunks.push(chunk));
      
      await new Promise((resolve, reject) => {
        piper.on('close', (code) => {
          if (code === 0) resolve(Buffer.concat(audioChunks));
          else reject(new Error(`Piper exited with code ${code}`));
        });
        piper.on('error', reject);
      });

      // Enviar audio via WebRTC (convertir PCM 16kHz -> Opus frames para werift)
      const audioData = Buffer.concat(audioChunks);
      this._sendAudioViaWebRTC(audioData);
      
    } catch (err) {
      console.error(`[Call ${this.callId}] TTS error:`, err);
    }
  }

  _sendAudioViaWebRTC(pcm16Buffer) {
    // Convertir PCM 16kHz mono -> frames para werift track
    // werift espera frames de audio para enviar via RTP
    // Esto es simplificado; en producción usar transceiver.sender.replaceTrack()
    console.log(`[Call ${this.callId}] Enviando ${pcm16Buffer.length} bytes de audio TTS`);
  }

  async _sendIceCandidate(candidate) {
    try {
      await fetch(`${CONFIG.metaGraphUrl}/${this.metadata.callId}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${CONFIG.metaToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          call_id: this.callId,
          action: 'transport',
          session: {
            sdp_type: 'candidate',
            sdp: JSON.stringify({
              candidate: candidate.candidate,
              sdpMid: candidate.sdpMid,
              sdpMLineIndex: candidate.sdpMLineIndex
            })
          }
        })
      });
    } catch (e) {
      console.error(`[Call ${this.callId}] Error enviando ICE:`, e);
    }
  }

  _cleanup() {
    console.log(`[Call ${this.callId}] Limpiando sesión`);
    if (this.sttProcess && !this.sttProcess.killed) this.sttProcess.kill();
    if (this.pc) this.pc.close();
    activeCalls.delete(this.callId);
  }
}

/**
 * Procesa webhook entrante de Meta (llamada entrante)
 */
async function handleIncomingCall(webhookBody) {
  const { callId, from, to, session } = webhookBody;
  
  if (!session || session.sdp_type !== 'offer') {
    console.log('[Sidecar] No es offer de llamada, ignorando');
    return;
  }

  console.log(`[Sidecar] Llamada entrante: ${callId} de ${from} -> ${webhookBody.to}`);

  // 1. Crear PeerConnection
  const pc = new RTCPeerConnection({
    iceServers: CONFIG.stunServers.map(url => ({ urls: url }))
  });

  // 2. Crear sesión
  const sessionObj = new CallSession(webhookBody.callId, pc, {
    callId: webhookBody.callId,
    from: webhookBody.from,
    to: webhookBody.to,
    direction: 'USER_INITIATED',
    sdp: session.sdp
  });

  // 3. Aplicar SDP offer remoto
  try {
    await pc.setRemoteDescription(new RTCSessionDescription({
      type: 'offer',
      sdp: session.sdp
    }));
    console.log('[Sidecar] SDP offer aplicado');
  } catch (e) {
    console.error('[Sidecar] Error en setRemoteDescription:', e);
    rejectCall(webhookBody.callId);
    return;
  }

  // 4. Crear answer
  let answer;
  try {
    answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);
    console.log('[Sidecar] SDP answer creado');
  } catch (e) {
    console.error('[Sidecar] Error creando answer:', e);
    rejectCall(webhookBody.callId);
    return;
  }

  // 5. Enviar pre_accept
  await sendCallAction(webhookBody.callId, 'pre_accept', {
    sdp_type: 'answer',
    sdp: answer.sdp
  });

  // 6. Enviar accept (media listo)
  // Esperar un poco a que ICE conecte
  setTimeout(async () => {
    if (sessionObj.isConnected) {
      await sendCallAction(webhookBody.callId, 'accept', {
        sdp_type: 'answer',
        sdp: sessionObj.pc.localDescription.sdp
      });
    }
  }, 2000);

  activeCalls.set(webhookBody.callId, sessionObj);
}

/**
 * Envía acción de llamada a Meta Graph API
 */
async function sendCallAction(callId, action, session) {
  try {
    const response = await fetch(`${CONFIG.metaGraphUrl}/${CONFIG.phoneId}/calls`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${CONFIG.metaToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        call_id: callId,
        action,
        session
      })
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(`Call action ${action} failed: ${JSON.stringify(data)}`);
    }
    console.log(`[Sidecar] ${action} enviado OK:`, data);
    return data;
  } catch (e) {
    console.error(`[Sidecar] Error en ${action}:`, e);
    throw e;
  }
}

/**
 * Rechaza llamada
 */
async function rejectCall(callId) {
  await sendCallAction(callId, 'reject', {});
}

/**
 * Termina llamada
 */
async function terminateCall(callId) {
  await sendCallAction(callId, 'terminate', {});
}

/**
 * Servidor HTTP para webhooks
 */
const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${CONFIG.port}`);
  
  // Health check
  if (url.pathname === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({ 
      status: 'ok', 
      activeCalls: activeCalls.size,
      timestamp: Date.now()
    }));
  }

  // Webhook de Meta
  if (url.pathname === '/webhook' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', async () => {
      try {
        const data = JSON.parse(body);
        
        // Verificar firma HMAC si hay app secret
        // (implementar verificación HMAC-SHA256)
        
        if (data.field === 'calls' && data.entry) {
          for (const entry of data.entry) {
            for (const change of entry.changes) {
              if (change.field === 'calls' && change.value) {
                const callData = change.value.calls?.[0];
                if (callData && callData.event === 'connect') {
                  await handleIncomingCall(callData);
                }
              }
            }
          }
        }
        
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ status: 'ok' }));
      } catch (e) {
        console.error('[Sidecar] Error procesando webhook:', e);
        res.writeHead(500);
        res.end('Error');
      }
    });
    return;
  }

  // Endpoint para recibir audio TTS y enviarlo a llamada activa
  if (url.pathname.startsWith('/calls/') && url.pathname.endsWith('/audio') && req.method === 'POST') {
    const callId = url.pathname.split('/')[2];
    const session = activeCalls.get(callId);
    
    if (!session) {
      res.writeHead(404);
      return res.end('Call not found');
    }

    // Recibir PCM 16kHz mono y enviar via WebRTC
    let body = Buffer.alloc(0);
    req.on('data', chunk => { body = Buffer.concat([body, chunk]); });
    req.on('end', () => {
      session._sendAudioViaWebRTC(body);
      res.writeHead(200);
      res.end('OK');
    });
    return;
  }

  // Endpoint para TTS directo (texto -> audio -> llamada)
  if (url.pathname === '/tts' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', async () => {
      try {
        const { callId, text } = JSON.parse(body);
        const session = activeCalls.get(callId);
        if (!session) {
          res.writeHead(404);
          return res.end('Call not found');
        }
        await session.speak(text);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: true }));
      } catch (e) {
        res.writeHead(500);
        res.end('Error');
      }
    });
    return;
  }

  // 404
  res.writeHead(404);
  res.end('Not found');
});

// Limpieza periódica de llamadas inactivas
setInterval(() => {
  const now = Date.now();
  for (const [callId, session] of activeCalls.entries()) {
    if (now - session.lastActivity > 300000) { // 5 min sin actividad
      console.log(`[Sidecar] Limpiando llamada inactiva: ${callId}`);
      session._cleanup();
    }
  }
}, 60000);

server.listen(CONFIG.port, () => {
  console.log(`[Sidecar] Servidor escuchando en puerto ${CONFIG.port}`);
  console.log(`[Sidecar] Webhook endpoint: http://localhost:${CONFIG.port}/webhook`);
  console.log(`[Sidecar] Health check: http://localhost:${CONFIG.port}/health`);
});

// Manejo graceful shutdown
process.on('SIGTERM', async () => {
  console.log('[Sidecar] SIGTERM recibido, cerrando...');
  for (const [callId, session] of activeCalls.entries()) {
    await terminateCall(callId);
    session._cleanup();
  }
  server.close(() => process.exit(0));
});