const fs = require('fs');
fetch('http://localhost:3000/api/backup', { method: 'POST' }).then(async res => {
  const reader = res.body.getReader();
  while(true) {
    const {done, value} = await reader.read();
    if(done) break;
    console.log('Received chunk:', value.length);
  }
}).catch(console.error);
