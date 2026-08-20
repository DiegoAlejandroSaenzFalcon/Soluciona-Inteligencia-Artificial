const fs = require('fs');
const path = require('path');

const CATS = [
  ['🍔 Hamburguesas', /^hamburguesa|^bronco/i],
  ['🌭 Perros', /^perro\b|^mini|^minisobrecupo|^doble carril|^especial|^sobre cupo/i],
  ['🔥 Choriperros', /^choriperro|^chori/i],
  ['🌶️ Perras', /^perra/i],
  ['🍌 Patacones', /^patac/i],
  ['🌽 Mazorcadas', /^mazorcada/i],
  ['🍟 Salchipapas y picadas', /^salchipapa|^picada/i],
  ['🥩 Carnes y parrilla', /^churrasquito|^lomo|^pechuga|^costillas|^alitas/i],
  ['👶 Infantil', /^infantil/i],
  ['🥟 Entradas', /^empanada/i],
  ['🍹 Bebidas naturales', /^jugo|^frutos|^limonada|^cerezada|^granizado/i],
  ['🥤 Gaseosas y aguas', /gaseosa|coca|postobon|sprite|quatro|hit|agua|pet/i],
  ['➕ Adiciones', /^queso|^tocineta|^jalape|^salchicha|^huevo|^ensalada|^chorizo|^aros|^papa francesa/i]
];

function categoriaDe(nombre) {
  for (const [cat, re] of CATS) {
    if (re.test(nombre)) return cat;
  }
  return '📦 Otros';
}

const archivo = process.argv[2] || 'config.json';
const p = path.resolve(__dirname, '..', archivo);
const data = JSON.parse(fs.readFileSync(p, 'utf8'));
let agregadas = 0;
(data.productos || []).forEach(prod => {
  if (!prod.categoria) {
    prod.categoria = categoriaDe(prod.nombre);
    agregadas++;
  }
});
fs.writeFileSync(p, JSON.stringify(data, null, 2), 'utf8');
const conteo = {};
(data.productos || []).forEach(prod => { conteo[prod.categoria] = (conteo[prod.categoria] || 0) + 1; });
console.log('Archivo:', archivo);
console.log('Categorías agregadas:', agregadas);
for (const [c, n] of Object.entries(conteo)) console.log('  ', c, '->', n);
const sinCat = (data.productos || []).filter(x => !x.categoria).length;
if (sinCat) console.log('Sin categoría:', sinCat);