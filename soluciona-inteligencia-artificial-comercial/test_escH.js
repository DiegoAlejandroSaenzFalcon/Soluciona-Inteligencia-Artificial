const qr = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAANwAAA...';
function escH(v) {
  return String(v == null ? '' : v).replace(/&/g, '&').replace(/</g, '<').replace(/>/g, '>').replace(/"/g, '"').replace(/'/g, '');
}
console.log('Original:', qr.substring(0, 50));
console.log('Escaped:', escH(qr).substring(0, 50));
console.log('Equal:', qr === escH(qr));