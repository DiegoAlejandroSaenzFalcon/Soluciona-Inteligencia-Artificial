'use strict';
// Página de acceso real (login con BD + registro + recuperación).
// Recibe `esc` (escapador HTML) y `negocio` desde web.js.

function paginaLogin(esc, negocio, error) {
  const nb = esc(String(negocio || 'Soluciona'));
  const errHtml = error ? esc(error) : '';
  return `<!doctype html><html lang="es"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Acceso ${nb}</title>
<link rel="icon" type="image/png" href="/icon-192.png">
<link rel="apple-touch-icon" href="/icon-192.png">
<style>
  :root{--g1:#075e54;--g2:#128c7e;--g3:#25D366;}
  *{box-sizing:border-box}
  body{margin:0;font-family:'Segoe UI',system-ui,Arial,sans-serif;min-height:100vh;display:flex;align-items:center;justify-content:center;
    background:radial-gradient(1200px 600px at 15% -10%,#0e2a26 0%,transparent 60%),radial-gradient(1000px 500px at 115% 120%,#0c3b2e 0%,transparent 55%),linear-gradient(135deg,#075e54,#0b2f2a);
    color:#e9f5f1;padding:20px}
  .card{width:100%;max-width:400px;background:rgba(255,255,255,.06);backdrop-filter:blur(14px);-webkit-backdrop-filter:blur(14px);
    border:1px solid rgba(255,255,255,.12);border-radius:20px;padding:34px 30px;box-shadow:0 20px 60px rgba(0,0,0,.45);animation:rise .5s ease both}
  @keyframes rise{from{opacity:0;transform:translateY(18px)}to{opacity:1;transform:none}}
  .logo{width:58px;height:58px;margin:0 auto 12px;border-radius:16px;display:flex;align-items:center;justify-content:center;
    background:linear-gradient(135deg,var(--g3),var(--g2));box-shadow:0 8px 24px rgba(37,211,102,.4)}
  .logo svg{width:30px;height:30px;fill:#fff}
  h1{margin:0 0 2px;font-size:1.4rem;text-align:center;font-weight:800}
  .sub{text-align:center;color:#9fc7bd;font-size:.9rem;margin-bottom:18px}
  .tabs{display:flex;gap:6px;margin:0 0 18px;padding:4px;background:rgba(255,255,255,.05);border-radius:12px}
  .tab{flex:1;padding:9px 0;border:none;border-radius:9px;background:transparent;color:#9fc7bd;font-weight:700;font-size:.85rem;cursor:pointer;transition:.2s}
  .tab.active{background:linear-gradient(135deg,var(--g3),var(--g2));color:#04231b}
  .pane{display:none}
  .pane.active{display:block}
  .field{position:relative;margin-bottom:14px}
  .field svg{position:absolute;left:14px;top:50%;transform:translateY(-50%);width:18px;height:18px;fill:#7faea3;opacity:.8}
  input[type=text],input[type=email],input[type=password]{width:100%;padding:14px 14px 14px 44px;border:1px solid rgba(255,255,255,.16);
    border-radius:12px;background:rgba(255,255,255,.05);color:#fff;font-size:1rem;outline:none;transition:.2s}
  input:focus{border-color:var(--g3);box-shadow:0 0 0 3px rgba(37,211,102,.18)}
  input::placeholder{color:#8fb3aa}
  .toggle{position:absolute;right:12px;top:50%;transform:translateY(-50%);cursor:pointer;background:none;border:none;color:#9fc7bd;font-size:.8rem}
  .row{display:flex;align-items:center;justify-content:space-between;margin:6px 2px 20px;font-size:.85rem;gap:10px}
  .remember{display:flex;align-items:center;gap:8px;color:#cfe9e1;cursor:pointer;user-select:none}
  .remember input{width:16px;height:16px;accent-color:var(--g3)}
  .forgot{color:#7fd1a8;text-decoration:none;white-space:nowrap;background:none;border:none;cursor:pointer;font-size:.85rem;padding:0}
  .forgot:hover{text-decoration:underline}
  button.enter{width:100%;padding:14px;border:none;border-radius:12px;background:linear-gradient(135deg,var(--g3),var(--g2));
    color:#04231b;font-weight:800;font-size:1.02rem;cursor:pointer;transition:.2s;box-shadow:0 8px 20px rgba(37,211,102,.35)}
  button.enter:hover{transform:translateY(-1px);box-shadow:0 12px 26px rgba(37,211,102,.5)}
  button.enter:active{transform:translateY(0)}
  button.enter:disabled{opacity:.6;cursor:not-allowed;transform:none}
  .hint{font-size:.8rem;color:#8fb3aa;margin:-6px 2px 14px;line-height:1.4}
  .msg{background:rgba(244,67,54,.15);border:1px solid rgba(244,67,54,.4);color:#ffb4ab;padding:10px 12px;border-radius:10px;
    font-size:.85rem;margin-bottom:14px;text-align:center;display:${error ? 'block' : 'none'}}
  .msg.ok{background:rgba(37,211,102,.15);border-color:rgba(37,211,102,.4);color:#b6f5d0}
  .token-box{background:rgba(0,0,0,.3);border:1px dashed rgba(255,255,255,.25);border-radius:10px;padding:10px 12px;margin-bottom:12px;
    font-family:monospace;font-size:.8rem;color:#7fd1a8;word-break:break-all;text-align:center}
  .foot{text-align:center;margin-top:18px;font-size:.75rem;color:#6f968c}
  @media(max-width:420px){.card{padding:26px 20px}}
</style></head>
<body>
  <div class="card">
    <div class="logo"><svg viewBox="0 0 24 24"><path d="M12 2C6.5 2 2 6.5 2 12c0 1.9.5 3.6 1.4 5.1L2 22l5.1-1.3C8.5 21.5 10.2 22 12 22c5.5 0 10-4.5 10-10S17.5 2 12 2zm0 18c-1.6 0-3.1-.4-4.4-1.2l-.3-.2-3 .8.8-3-.2-.3A8 8 0 1 1 12 20zm4.3-6c-.2-.1-1.3-.7-1.5-.7-.2 0-.4 0-.5.1-.1.1-.5.5-.6.6-.1.1-.2.1-.4 0-.2-.1-.8-.3-1.5-1-.6-.5-1-1.2-1.1-1.4-.1-.2 0-.3 0-.4 0-.1.1-.2.2-.4.3-.2.4-.5.6-.8.1-.3.1-.6 0-.8-.1-.2-.4-1.3-.6-1.7-.2-.5-.4-.4-.5-.4h-.4c-.1 0-.4 0-.6.3-.2.3-.8.8-.8 2s.8 2.3.9 2.5c.1.2 1.3 2 3.2 2.8 1.9.8 2.3.7 2.7.6.4-.1 1.3-.5 1.5-1 .2-.5.2-1 .1-1.1 0-.1-.2-.2-.4-.3z"/></svg></div>
    <h1>Acceso al panel</h1>
    <div class="sub">${nb}</div>
    <div class="msg" id="msg">${errHtml}</div>

    <div class="tabs">
      <button type="button" class="tab active" data-tab="login" onclick="showTab('login')">Entrar</button>
      <button type="button" class="tab" data-tab="register" onclick="showTab('register')">Registrarse</button>
      <button type="button" class="tab" data-tab="forgot" onclick="showTab('forgot')">Recuperar</button>
    </div>

    <form id="formLogin" class="pane active" method="post" action="/login" autocomplete="on">
      <div class="field">
        <svg viewBox="0 0 24 24"><path d="M12 12a5 5 0 1 0-5-5 5 5 0 0 0 5 5zm0 2c-3.3 0-10 1.7-10 5v3h20v-3c0-3.3-6.7-5-10-5z"/></svg>
        <input name="usuario" id="usuario" type="text" placeholder="Correo electrónico o usuario" autocomplete="username">
      </div>
      <div class="field">
        <svg viewBox="0 0 24 24"><path d="M18 8h-1V6a5 5 0 0 0-10 0h2a3 3 0 1 1 6 0v2H6a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V10a2 2 0 0 0-2-2zm0 12H6V10h12z"/></svg>
        <input name="password" id="password" type="password" placeholder="Contraseña" autocomplete="current-password">
        <button type="button" class="toggle" id="togglePass" onclick="toggleField('password','togglePass')">Mostrar</button>
      </div>
      <div class="row">
        <label class="remember"><input type="checkbox" id="recuerdame" name="recuerdame"> Recuérdame</label>
        <button type="button" class="forgot" onclick="showTab('forgot')">¿Olvidaste tu contraseña?</button>
      </div>
      <button class="enter" type="submit">Entrar</button>
    </form>

    <form id="formRegistro" class="pane" autocomplete="off">
      <div class="field">
        <svg viewBox="0 0 24 24"><path d="M12 12a5 5 0 1 0-5-5 5 5 0 0 0 5 5zm0 2c-3.3 0-10 1.7-10 5v3h20v-3c0-3.3-6.7-5-10-5z"/></svg>
        <input type="text" id="regNombre" placeholder="Nombre completo">
      </div>
      <div class="field">
        <svg viewBox="0 0 24 24"><path d="M20 4H4a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2zm0 4-8 5-8-5V6l8 5 8-5z"/></svg>
        <input type="email" id="regEmail" placeholder="Correo electrónico" autocomplete="email">
      </div>
      <div class="field">
        <svg viewBox="0 0 24 24"><path d="M18 8h-1V6a5 5 0 0 0-10 0h2a3 3 0 1 1 6 0v2H6a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V10a2 2 0 0 0-2-2zm0 12H6V10h12z"/></svg>
        <input type="password" id="regPass" placeholder="Contraseña (mínimo 8 caracteres)">
        <button type="button" class="toggle" id="toggleReg" onclick="toggleField('regPass','toggleReg')">Mostrar</button>
      </div>
      <div class="hint">Se creará una cuenta con rol Operador. Si necesitas permisos de administración, usa la cuenta admin.</div>
      <button class="enter" type="submit">Crear cuenta</button>
    </form>

    <div id="paneForgot" class="pane">
      <div class="field">
        <svg viewBox="0 0 24 24"><path d="M20 4H4a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2zm0 4-8 5-8-5V6l8 5 8-5z"/></svg>
        <input type="email" id="fEmail" placeholder="Correo de tu cuenta" autocomplete="email">
      </div>
      <button class="enter" type="button" id="btnForgot" onclick="solicitarReset()">Solicitar recuperación</button>
      <div id="resetBox" style="display:none;margin-top:14px">
        <div class="token-box" id="tokenBox"></div>
        <div class="field">
          <svg viewBox="0 0 24 24"><path d="M18 8h-1V6a5 5 0 0 0-10 0h2a3 3 0 1 1 6 0v2H6a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V10a2 2 0 0 0-2-2zm0 12H6V10h12z"/></svg>
          <input type="text" id="fToken" placeholder="Código de recuperación">
        </div>
        <div class="field">
          <svg viewBox="0 0 24 24"><path d="M18 8h-1V6a5 5 0 0 0-10 0h2a3 3 0 1 1 6 0v2H6a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V10a2 2 0 0 0-2-2zm0 12H6V10h12z"/></svg>
          <input type="password" id="fPass" placeholder="Nueva contraseña (mínimo 8 caracteres)">
          <button type="button" class="toggle" id="toggleReset" onclick="toggleField('fPass','toggleReset')">Mostrar</button>
        </div>
        <button class="enter" type="button" id="btnReset" onclick="aplicarReset()">Restablecer contraseña</button>
      </div>
    </div>

    <div class="foot">Soluciona Inteligencia Artificial</div>
  </div>
  <script>
    (function(){
      var msg=document.getElementById('msg');
      function setMsg(t,ok){msg.textContent=t||'';msg.className=ok?'msg ok':'msg';msg.style.display=t?'block':'none';}
      window.showTab=function(n){
        var tabs=document.querySelectorAll('.tab');
        for(var i=0;i<tabs.length;i++)tabs[i].className='tab'+(tabs[i].getAttribute('data-tab')===n?' active':'');
        var map={login:'formLogin',register:'formRegistro',forgot:'paneForgot'};
        var panes=document.querySelectorAll('.pane');
        for(var j=0;j<panes.length;j++)panes[j].className='pane'+(panes[j].id===map[n]?' active':'');
        setMsg('',false);
      };
      window.toggleField=function(id,btn){
        var p=document.getElementById(id),b=document.getElementById(btn);
        if(p.type==='password'){p.type='text';b.textContent='Ocultar';}else{p.type='password';b.textContent='Mostrar';}
      };
      document.getElementById('formLogin').addEventListener('submit',function(){
        var r=document.getElementById('recuerdame').checked;
        var u=document.getElementById('usuario').value,p=document.getElementById('password').value;
        if(r){try{localStorage.setItem('soluciona_cred',JSON.stringify({u:u,p:p,r:true}));}catch(e){}}
        else{try{localStorage.removeItem('soluciona_cred');}catch(e){}}
      });
      document.getElementById('formRegistro').addEventListener('submit',async function(ev){
        ev.preventDefault();
        var btn=document.querySelector('#formRegistro .enter');btn.disabled=true;btn.textContent='Creando…';
        var nombre=document.getElementById('regNombre').value.trim();
        var email=document.getElementById('regEmail').value.trim();
        var password=document.getElementById('regPass').value;
        setMsg('',false);
        try{
          var r=await fetch('/api/auth/register',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({nombre:nombre,email:email,password:password})});
          var d=await r.json();
          if(r.status!==201){setMsg(d.error||'No se pudo crear la cuenta',false);return;}
          setMsg('Cuenta creada. Ahora inicia sesión.',true);
          document.getElementById('usuario').value=email;
          document.getElementById('regPass').value='';
          window.showTab('login');
        }catch(e){setMsg('Error de red',false);}
        finally{btn.disabled=false;btn.textContent='Crear cuenta';}
      });
      window.solicitarReset=async function(){
        var btn=document.getElementById('btnForgot');btn.disabled=true;btn.textContent='Procesando…';
        var email=document.getElementById('fEmail').value.trim();
        setMsg('',false);
        try{
          var r=await fetch('/api/auth/forgot-password',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email:email})});
          var d=await r.json();
          if(r.status!==200){setMsg(d.error||'No se pudo solicitar',false);return;}
          document.getElementById('resetBox').style.display='block';
          if(d.resetToken){
            document.getElementById('tokenBox').textContent='Código de recuperación (válido '+d.expiresInMin+' min): '+d.resetToken;
          }else{
            document.getElementById('tokenBox').textContent='Si el correo existe, revisa el token en la consola del servidor.';
          }
          setMsg('Solicitud procesada.',true);
        }catch(e){setMsg('Error de red',false);}
        finally{btn.disabled=false;btn.textContent='Solicitar recuperación';}
      };
      window.aplicarReset=async function(){
        var btn=document.getElementById('btnReset');btn.disabled=true;btn.textContent='Procesando…';
        var resetToken=document.getElementById('fToken').value.trim();
        var newPassword=document.getElementById('fPass').value;
        setMsg('',false);
        try{
          var r=await fetch('/api/auth/reset-password',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({resetToken:resetToken,newPassword:newPassword})});
          var d=await r.json();
          if(r.status!==200){setMsg(d.error||'No se pudo restablecer',false);return;}
          setMsg('Contraseña restablecida. Inicia sesión.',true);
          document.getElementById('password').value=newPassword;
          document.getElementById('resetBox').style.display='none';
          window.showTab('login');
        }catch(e){setMsg('Error de red',false);}
        finally{btn.disabled=false;btn.textContent='Restablecer contraseña';}
      };
      try{
        var d=JSON.parse(localStorage.getItem('soluciona_cred')||'{}');
        if(d.u)document.getElementById('usuario').value=d.u;
        if(d.p)document.getElementById('password').value=d.p;
        if(d.r)document.getElementById('recuerdame').checked=true;
      }catch(e){}
    })();
  </script>
</body></html>`;
}

module.exports = { paginaLogin };