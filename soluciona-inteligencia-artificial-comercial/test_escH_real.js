function escH(v) {
  return String(v == null ? '' : v).replace(/&/g, '&').replace(/</g, '<').replace(/>/g, '>').replace(/"/g, '"').replace(/'/g, ''');
}

const qr = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAANwAAA...';
console.log('Equal:', qr === escH(qr));
console.log('Escaped:', escH(qr).substring(0, 50));