'use strict';
// ============================================================
// Panel Empresarial — Configuración (Config v2)
// ============================================================
async function cargarConfig() {
  const cont = document.getElementById('viewContent');
  cont.innerHTML = '<div class="empty">Cargando…</div>';
  try {
    const r = await api('GET', '/api/configv2/sections');
    if (r.status !== 200) throw new Error(r.data && r.data.error || 'error');
    const secs = r.data.sections || [];
    const conWrite = secs.some(s => s.canWrite);
    const conSecrets = secs.some(s => s.canSecrets);
    cont.innerHTML = `
      <div class="toolbar">
        <button class="btn2 primary" onclick="verAuditoria()">🕓 Auditoría</button>
        ${conSecrets ? '<button class="btn2" onclick="verSecrets()">🔑 Secrets</button>' : ''}
        <span class="sub" style="margin:0">Secciones de configuración con validación, versionado y rollback.</span>
      </div>
      <div class="grid" id="cfgGrid"></div>`;
    const grid = document.getElementById('cfgGrid');
    grid.innerHTML = secs.map(s => `
      <div class="card">
        <h3 style="margin-bottom:.3rem">${escH(s.section)}</h3>
        <p class="sub" style="margin-bottom:.8rem">${escH((s.keys || []).join(', '))}</p>
        ${s.canWrite ? `<button class="btn2 primary" onclick="verSeccion('${s.section}')">Editar</button> ` : ''}
        <button class="btn2" onclick="verVersiones('${s.section}')">Versiones</button>
      </div>`).join('');
  } catch (e) {
    cont.innerHTML = '<div class="empty">' + escH(e.message) + '</div>';
  }
}

async function verSeccion(section) {
  const cont = document.getElementById('viewContent');
  cont.innerHTML = '<div class="empty">Cargando…</div>';
  try {
    const r = await api('GET', '/api/configv2/' + section);
    if (r.status !== 200) throw new Error(r.data && r.data.error || 'error');
    const payload = r.data.payload;
    cont.innerHTML = `
      <div class="card">
        <div class="flex" style="margin-bottom:.8rem">
          <button class="btn2" onclick="cargarConfig()">← Secciones</button>
          <h3 style="flex:1">${escH(section)}</h3>
        </div>
        <label style="font-size:.8rem;color:var(--mut)">JSON (validado con Zod al guardar)</label>
        <textarea class="json" id="cfgEditor" spellcheck="false">${escH(JSON.stringify(payload, null, 2))}</textarea>
        <div class="toolbar" style="margin-top:.8rem">
          <button class="btn2 primary" onclick="guardarSeccion('${section}')">💾 Guardar</button>
          <button class="btn2" onclick="verSeccion('${section}')">↺ Recargar</button>
          <button class="btn2" onclick="verVersiones('${section}')">Versiones</button>
        </div>
        <div class="err" id="cfgErr" style="color:var(--err);font-size:.85rem"></div>
      </div>`;
  } catch (e) {
    cont.innerHTML = '<div class="empty">' + escH(e.message) + '</div>';
  }
}

async function guardarSeccion(section) {
  let body;
  try {
    body = JSON.parse(document.getElementById('cfgEditor').value);
  } catch (e) {
    document.getElementById('cfgErr').textContent = 'JSON inválido: ' + e.message;
    return;
  }
  const r = await api('PUT', '/api/configv2/' + section, body);
  if (r.status !== 200) {
    const d = r.data || {};
    document.getElementById('cfgErr').textContent = (d.error === 'validacion' ? 'Validación: ' + JSON.stringify(d.issues || []) : d.error) || 'error';
    return;
  }
  toast('Configuración guardada (versión ' + (r.data && r.data.version) + ')', 'ok');
}

async function verVersiones(section) {
  const cont = document.getElementById('viewContent');
  cont.innerHTML = '<div class="empty">Cargando…</div>';
  try {
    const r = await api('GET', '/api/configv2/' + section + '/versions');
    if (r.status !== 200) throw new Error(r.data && r.data.error || 'error');
    const versions = r.data.versions || [];
    cont.innerHTML = `
      <div class="card">
        <div class="flex" style="margin-bottom:.8rem"><button class="btn2" onclick="verSeccion('${section}')">← Editar</button>
          <h3 style="flex:1">Versiones de ${escH(section)}</h3></div>
        <table>
          <tr><th>Versión</th><th>Fecha</th><th>Usuario</th><th>IP</th><th></th></tr>
          ${versions.map(v => `<tr>
            <td class="mono">#${v.id}</td><td>${fmtDate(v.created_at)}</td>
            <td>${escH(v.changed_by_email || '—')}</td><td>${escH(v.ip || '')}</td>
            <td><button class="btn2" onclick="hacerRollback('${section}', ${v.id})">Rollback</button></td></tr>`).join('')}
        </table>
      </div>`;
  } catch (e) {
    cont.innerHTML = '<div class="empty">' + escH(e.message) + '</div>';
  }
}

async function hacerRollback(section, versionId) {
  if (!confirm('¿Restaurar la versión #' + versionId + ' de "' + section + '"?')) return;
  const r = await api('POST', '/api/configv2/' + section + '/rollback', { versionId });
  if (r.status !== 200) { toast((r.data && r.data.error) || 'error', 'err'); return; }
  toast('Rollback aplicado', 'ok');
  verSeccion(section);
}

async function verAuditoria() {
  const cont = document.getElementById('viewContent');
  cont.innerHTML = '<div class="empty">Cargando…</div>';
  try {
    const r = await api('GET', '/api/audit?limit=200');
    if (r.status !== 200) throw new Error(r.data && r.data.error || 'error');
    const logs = r.data.audit || [];
    cont.innerHTML = `
      <div class="card">
        <div class="flex" style="margin-bottom:.8rem"><button class="btn2" onclick="cargarConfig()">← Configuración</button>
          <h3 style="flex:1">🕓 Auditoría</h3></div>
        <table>
          <tr><th>Fecha</th><th>Usuario</th><th>Acción</th><th>Entidad</th><th>ID</th><th>IP</th></tr>
          ${logs.map(l => `<tr>
            <td>${fmtDate(l.created_at)}</td><td>${escH(l.usuario_nombre || '—')}</td>
            <td>${badge(l.accion, 'b-ac')}</td><td>${escH(l.entidad || '')}</td>
            <td class="mono">${escH(l.entidad_id || '')}</td><td>${escH(l.ip || '')}</td></tr>`).join('')}
        </table>
      </div>`;
  } catch (e) {
    cont.innerHTML = '<div class="empty">' + escH(e.message) + '</div>';
  }
}

async function verSecrets() {
  const cont = document.getElementById('viewContent');
  cont.innerHTML = '<div class="empty">Cargando…</div>';
  try {
    const r = await api('GET', '/api/configv2/secrets');
    if (r.status !== 200) throw new Error(r.data && r.data.error || 'error');
    const secrets = r.data.secrets || [];
    cont.innerHTML = `
      <div class="card">
        <div class="flex" style="margin-bottom:.8rem"><button class="btn2" onclick="cargarConfig()">← Configuración</button>
          <h3 style="flex:1">🔑 Secrets cifrados</h3></div>
        <table>
          <tr><th>Clave</th><th>Actualizado</th><th></th></tr>
          ${secrets.map(s => `<tr><td class="mono">${escH(s.clave)}</td><td>${fmtDate(s.updated_at)}</td>
            <td><button class="btn2 danger" onclick="borrarSecret('${escH(s.clave)}')">Eliminar</button></td></tr>`).join('')}
        </table>
        <div class="frm" style="margin-top:1rem">
          <label class="full">Nueva clave<input id="secKey" placeholder="ej: openai_api_key"></label>
          <label class="full">Valor<input id="secVal" placeholder="valor a cifrar"></label>
        </div>
        <div class="toolbar"><button class="btn2 primary" onclick="guardarSecret()">Guardar secret</button></div>
      </div>`;
  } catch (e) {
    cont.innerHTML = '<div class="empty">' + escH(e.message) + '</div>';
  }
}

async function guardarSecret() {
  const key = document.getElementById('secKey').value.trim();
  const value = document.getElementById('secVal').value;
  if (!key || !value) { toast('Clave y valor requeridos', 'err'); return; }
  const r = await api('POST', '/api/configv2/secrets', { key, value });
  if (r.status !== 200) { toast((r.data && r.data.error) || 'error', 'err'); return; }
  toast('Secret guardado', 'ok');
  verSecrets();
}

async function borrarSecret(clave) {
  if (!confirm('¿Eliminar el secret "' + clave + '"?')) return;
  const r = await api('DELETE', '/api/configv2/secrets/' + encodeURIComponent(clave));
  if (r.status !== 200) { toast((r.data && r.data.error) || 'error', 'err'); return; }
  toast('Secret eliminado');
  verSecrets();
}