'use strict';
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
  .card{width:100%;max-width:420px;background:rgba(255,255,255,.06);backdrop-filter:blur(14px);-webkit-backdrop-filter:blur(14px);
    border:1px solid rgba(255,255,255,.12);border-radius:20px;padding:36px 32px;box-shadow:0 20px 60px rgba(0,0,0,.45);animation:rise .5s ease both}
  @keyframes rise{from{opacity:0;transform:translateY(18px)}to{opacity:1;transform:none}}
  .logo{width:64px;height:64px;margin:0 auto 16px;border-radius:18px;display:flex;align-items:center;justify-content:center;
    background:linear-gradient(135deg,var(--g3),var(--g2));box-shadow:0 8px 24px rgba(37,211,102,.4)}
  .logo svg{width:34px;height:34px;fill:#fff}
  h1{margin:0 0 4px;font-size:1.5rem;text-align:center;font-weight:800;letter-spacing:.2px}
  .sub{text-align:center;color:#9fc7bd;font-size:.95rem;margin-bottom:22px}
  .tabs{display:flex;gap:6px;margin:0 0 22px;padding:4px;background:rgba(255,255,255,.05);border-radius:12px}
  .tab{flex:1;padding:10px 0;border:none;border-radius:9px;background:transparent;color:#9fc7bd;font-weight:700;font-size:.9rem;cursor:pointer;transition:.2s}
  .tab.active{background:linear-gradient(135deg,var(--g3),var(--g2));color:#04231b}
  .pane{display:none;animation:fadeIn .25s ease}
  .pane.active{display:block}
  @keyframes fadeIn{from{opacity:0;transform:translateY(4px)}to{opacity:1;transform:none}}
  .field{position:relative;margin-bottom:16px}
  .field svg{position:absolute;left:16px;top:50%;transform:translateY(-50%);width:20px;height:20px;fill:#7faea3;opacity:.8;transition:fill .2s}
  .field:focus-within svg{fill:var(--g3);opacity:1}
  input[type=text],input[type=email],input[type=password]{width:100%;padding:15px 15px 15px 50px;border:1px solid rgba(255,255,255,.16);
    border-radius:12px;background:rgba(255,255,255,.05);color:#fff;font-size:1rem;outline:none;transition:.2s}
  input:focus{border-color:var(--g3);box-shadow:0 0 0 3px rgba(37,211,102,.18);background:rgba(255,255,255,.08)}
  input::placeholder{color:#8fb3aa}
  .toggle{position:absolute;right:14px;top:50%;transform:translateY(-50%);cursor:pointer;background:none;border:none;color:#9fc7bd;font-size:.8rem;padding:4px 8px;border-radius:6px;transition:background .2s}
  .toggle:hover{background:rgba(255,255,255,.1)}
  .row{display:flex;align-items:center;justify-content:space-between;margin:8px 2px 22px;font-size:.85rem;gap:10px}
  .remember{display:flex;align-items:center;gap:8px;color:#cfe9e1;cursor:pointer;user-select:none}
  .remember input{width:18px;height:18px;accent-color:var(--g3);cursor:pointer}
  .remember span{font-size:.85rem}
  .forgot{color:#7fd1a8;text-decoration:none;white-space:nowrap;background:none;border:none;cursor:pointer;font-size:.85rem;padding:0}
  .forgot:hover{text-decoration:underline}
  button.enter{width:100%;padding:15px;border:none;border-radius:12px;background:linear-gradient(135deg,var(--g3),var(--g2));
    color:#04231b;font-weight:800;font-size:1.05rem;cursor:pointer;transition:.2s;box-shadow:0 8px 20px rgba(37,211,102,.35);position:relative}
  button.enter:hover{transform:translateY(-1px);box-shadow:0 12px 26px rgba(37,211,102,.5)}
  button.enter:active{transform:translateY(0)}
  button.enter:disabled{opacity:.6;cursor:not-allowed;transform:none;box-shadow:none}
  .btn-spinner{display:inline-block;width:18px;height:18px;border:2px solid transparent;border-top-color:#04231b;border-radius:50%;animation:spin .8s linear infinite;margin-right:8px;vertical-align:middle}
  @keyframes spin{to{transform:rotate(360deg)}}
  .hint{font-size:.8rem;color:#8fb3aa;margin:-4px 2px 16px;line-height:1.4}
  .msg{background:rgba(244,67,54,.15);border:1px solid rgba(244,67,54,.4);color:#ffb4ab;padding:12px 14px;border-radius:10px;
    font-size:.85rem;margin-bottom:16px;text-align:center;display:none;animation:slideDown .3s ease}
  .msg.ok{background:rgba(37,211,102,.15);border-color:rgba(37,211,102,.4);color:#b6f5d0}
  .msg.visible{display:block}
  @keyframes slideDown{from{opacity:0;transform:translateY(-8px)}to{opacity:1;transform:none}}
  .token-box{background:rgba(0,0,0,.3);border:1px dashed rgba(255,255,255,.25);border-radius:10px;padding:12px;margin-bottom:14px;
    font-family:monospace;font-size:.8rem;color:#7fd1a8;word-break:break-all;text-align:center}
  .foot{text-align:center;margin-top:20px;font-size:.75rem;color:#6f968c}
  .help-text{font-size:.75rem;color:#8fb3aa;margin-top:4px;display:block}
  @media(max-width:440px){.card{padding:28px 22px}}
</style></head>
<body>
  <div class="card" role="main">
    <div class="logo" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M12 2C6.5 2 2 6.5 2 12c0 1.9.5 3.6 1.4 5.1L2 22l5.1-1.3C8.5 21.5 10.2 22 12 22c5.5 0 10-4.5 10-10S17.5 2 12 2zm0 18c-1.6 0-3.1-.4-4.4-1.2l-.3-.2-3 .8.8-3-.2-.3A8 8 0 1 1 12 20zm4.3-6c-.2-.1-1.3-.7-1.5-.7-.2 0-.4 0-.5.1-.1.1-.5.5-.6.6-.1.1-.2.1-.4 0-.2-.1-.8-.3-1.5-1-.6-.5-1-1.2-1.1-1.4-.1-.2 0-.3 0-.4 0-.1.1-.2.2-.4.3-.2.4-.5.6-.8.1-.3.1-.6 0-.8-.1-.2-.4-1.3-.6-1.7-.2-.5-.4-.4-.5-.4h-.4c-.1 0-.4 0-.6.3-.2.3-.8.8-.8 2s.8 2.3.9 2.5c.1.2 1.3 2 3.2 2.8 1.9.8 2.3.7 2.7.6.4-.1 1.3-.5 1.5-1 .2-.5.2-1 .1-1.1 0-.1-.2-.2-.4-.3z"/></svg></div>
    <h1>Acceso al panel</h1>
    <div class="sub">${nb}</div>
    <div class="msg" id="msg" role="alert" aria-live="polite">${errHtml}</div>

    <div class="tabs" role="tablist">
      <button type="button" class="tab active" role="tab" aria-selected="true" data-tab="login" onclick="showTab('login')">Entrar</button>
      <button type="button" class="tab" role="tab" aria-selected="false" data-tab="register" onclick="showTab('register')">Registrarse</button>
      <button type="button" class="tab" role="tab" aria-selected="false" data-tab="forgot" onclick="showTab('forgot')">Recuperar</button>
    </div>

    <form id="formLogin" class="pane active" method="post" action="/login" autocomplete="on" role="tabpanel" aria-label="Iniciar sesión">
      <div class="field">
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 12a5 5 0 1 0-5-5 5 5 0 0 0 5 5zm0 2c-3.3 0-10 1.7-10 5v3h20v-3c0-3.3-6.7-5-10-5z"/></svg>
        <input name="usuario" id="usuario" type="text" placeholder="Correo electrónico o usuario" autocomplete="username" aria-label="Usuario o correo" required>
      </div>
      <div class="field">
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M18 8h-1V6a5 5 0 0 0-10 0h2a3 3 0 1 1 6 0v2H6a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V10a2 2 0 0 0-2-2zm0 12H6V10h12z"/></svg>
        <input name="password" id="password" type="password" placeholder="Contraseña" autocomplete="current-password" aria-label="Contraseña" required>
        <button type="button" class="toggle" id="togglePass" onclick="toggleField('password','togglePass')" aria-label="Mostrar contraseña">Mostrar</button>
      </div>
      <div class="row">
        <label class="remember"><input type="checkbox" id="recuerdame" name="recuerdame"><span>Recordar mi usuario (no la contraseña)</span></label>
        <button type="button" class="forgot" onclick="showTab('forgot')">¿Olvidaste tu contraseña?</button>
      </div>
      <button class="enter" type="submit"><span class="btn-spinner" id="lgSpinner" style="display:none"></span><span id="lgBtnText">Entrar</span></button>
    </form>

    <form id="formRegistro" class="pane" autocomplete="off" role="tabpanel" aria-label="Crear cuenta">
      <div class="field">
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 12a5 5 0 1 0-5-5 5 5 0 0 0 5 5zm0 2c-3.3 0-10 1.7-10 5v3h20v-3c0-3.3-6.7-5-10-5z"/></svg>
        <input type="text" id="regNombre" placeholder="Nombre completo" autocomplete="name" required aria-label="Nombre completo">
      </div>
      <div class="field">
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 4H4a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2zm0 4-8 5-8-5V6l8 5 8-5z"/></svg>
        <input type="email" id="regEmail" placeholder="Correo electrónico" autocomplete="email" required aria-label="Correo electrónico">
      </div>
      <div class="field">
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M18 8h-1V6a5 5 0 0 0-10 0h2a3 3 0 1 1 6 0v2H6a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V10a2 2 0 0 0-2-2zm0 12H6V10h12z"/></svg>
        <input type="password" id="regPass" placeholder="Contraseña (mínimo 8 caracteres)" autocomplete="new-password" required aria-label="Contraseña" minlength="8">
        <button type="button" class="toggle" id="toggleReg" onclick="toggleField('regPass','toggleReg')" aria-label="Mostrar contraseña">Mostrar</button>
      </div>
      <div class="hint">Se creará una cuenta con rol Operador. Para permisos de administración, usa la cuenta admin.</div>
      <button class="enter" type="submit"><span class="btn-spinner" id="regSpinner" style="display:none"></span><span id="regBtnText">Crear cuenta</span></button>
    </form>

    <div id="paneForgot" class="pane" role="tabpanel" aria-label="Recuperar contraseña">
      <div class="field">
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 4H4a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2zm0 4-8 5-8-5V6l8 5 8-5z"/></svg>
        <input type="email" id="fEmail" placeholder="Correo de tu cuenta" autocomplete="email" required aria-label="Correo de tu cuenta">
      </div>
      <button class="enter" type="button" id="btnForgot" onclick="solicitarReset()"><span class="btn-spinner" id="fSpinner" style="display:none"></span><span id="fBtnText">Solicitar recuperación</span></button>
      <div id="resetBox" style="display:none;margin-top:14px">
        <div class="token-box" id="tokenBox"></div>
        <div class="field">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M18 8h-1V6a5 5 0 0 0-10 0h2a3 3 0 1 1 6 0v2H6a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V10a2 2 0 0 0-2-2zm0 12H6V10h12z"/></svg>
          <input type="text" id="fToken" placeholder="Código de recuperación" autocomplete="one-time-code" aria-label="Código de recuperación">
        </div>
        <div class="field">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M18 8h-1V6a5 5 0 0 0-10 0h2a3 3 0 1 1 6 0v2H6a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V10a2 2 0 0 0-2-2zm0 12H6V10h12z"/></svg>
          <input type="password" id="fPass" placeholder="Nueva contraseña (mínimo 8 caracteres)" autocomplete="new-password" required aria-label="Nueva contraseña" minlength="8">
          <button type="button" class="toggle" id="toggleReset" onclick="toggleField('fPass','toggleReset')" aria-label="Mostrar contraseña">Mostrar</button>
        </div>
        <button class="enter" type="button" id="btnReset" onclick="aplicarReset()"><span class="btn-spinner" id="rSpinner" style="display:none"></span><span id="rBtnText">Restablecer contraseña</span></button>
      </div>
    </div>

    <div class="foot">Soluciona Inteligencia Artificial</div>
  </div>
  <script>
    (function(){
      var msg=document.getElementById('msg');
      function setMsg(t,ok){msg.textContent=t||'';msg.className='msg'+(ok?' ok':'');msg.classList.toggle('visible',!!t);}
      window.showTab=function(n){
        var tabs=document.querySelectorAll('.tab');
        for(var i=0;i<tabs.length;i++){var sel=tabs[i].getAttribute('data-tab')===n;tabs[i].className='tab'+(sel?' active':'');tabs[i].setAttribute('aria-selected',sel);}
        var map={login:'formLogin',register:'formRegistro',forgot:'paneForgot'};
        var panes=document.querySelectorAll('.pane');
        for(var j=0;j<panes.length;j++)panes[j].className='pane'+(panes[j].id===map[n]?' active':'');
        setMsg('',false);
      };
      window.toggleField=function(id,btn){
        var p=document.getElementById(id),b=document.getElementById(btn);
        if(p.type==='password'){p.type='text';b.textContent='Ocultar';}else{p.type='password';b.textContent='Mostrar';}
      };
      function setLoading(formId, loading){
        var spinner=document.getElementById(formId+'Spinner');
        var btnText=document.getElementById(formId+'BtnText');
        var btn=document.querySelector('#'+formId+' .enter');
        if(spinner)spinner.style.display=loading?'inline-block':'none';
        if(btnText)btnText.textContent=loading?'Procesando…':(formId==='lg'?'Entrar':formId==='reg'?'Crear cuenta':formId==='f'?'Solicitar recuperación':'Restablecer contraseña');
        if(btn)btn.disabled=loading;
      }
      function handleEnterSubmit(e){
        if(e.key==='Enter' && !e.shiftKey){
          var btn=e.target.closest('form')?.querySelector('.enter');
          if(btn && !btn.disabled) btn.click();
        }
      }
      document.addEventListener('keydown', handleEnterSubmit);
      document.getElementById('formLogin').addEventListener('submit',function(){
        var r=document.getElementById('recuerdame').checked;
        var u=document.getElementById('usuario').value;
        if(r){try{localStorage.setItem('soluciona_cred',JSON.stringify({u:u,r:true}));}catch(e){}}
        else{try{localStorage.removeItem('soluciona_cred');}catch(e){}}
        setLoading('lg', true);
      });
      document.getElementById('formRegistro').addEventListener('submit',async function(ev){
        ev.preventDefault();
        setLoading('reg', true);
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
        finally{setLoading('reg', false);}
      });
      window.solicitarReset=async function(){
        setLoading('f', true);
        var email=document.getElementById('fEmail').value.trim();
        setMsg('',false);
        try{
          var r=await fetch('/api/auth/forgot-password',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email:email})});
          var d=await r.json();
          if(r.status!==200){setMsg(d.error||'No se pudo solicitar',false);return;}
          document.getElementById('resetBox').style.display='block';
          document.getElementById('tokenBox').textContent='Si el correo existe, revisa el código en la consola del servidor.';
          setMsg('Solicitud procesada. Revisa la consola del servidor para el código.',true);
        }catch(e){setMsg('Error de red',false);}
        finally{setLoading('f', false);}
      };
      window.aplicarReset=async function(){
        setLoading('r', true);
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
        finally{setLoading('r', false);}
      };
      try{
        var d=JSON.parse(localStorage.getItem('soluciona_cred')||'{}');
        if(d.u)document.getElementById('usuario').value=d.u;
        if(d.r)document.getElementById('recuerdame').checked=true;
      }catch(e){}
      document.getElementById('usuario').focus();
    })();
  </script>
</body></html>`;
}
module.exports = { paginaLogin };