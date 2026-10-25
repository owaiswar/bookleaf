import tls from 'tls';

const host = 'ac-gsf9jnw-shard-00-00.8i265be.mongodb.net';
console.log('Testing TLS connection to', host);

const socket = tls.connect(27017, host, { servername: host, timeout: 5000 }, () => {
  console.log('TLS_SUCCESS: Authorized=', socket.authorized);
  socket.end();
  process.exit(0);
});

socket.on('error', (err) => {
  console.error('TLS_FAILED:', err.message);
  process.exit(1);
});

socket.on('timeout', () => {
  console.error('TLS_TIMEOUT');
  socket.destroy();
  process.exit(1);
});
