// Minimal secure seed upload handler (express)
// WARNING: This is an example. For production, use an HSM or cloud KMS to decrypt and perform signing inside the KMS/HSM.

const express = require('express');
const fs = require('fs');
const crypto = require('crypto');
const { v4: uuidv4 } = require('uuid');
const app = express();
app.use(express.json({ limit: '128kb' }));

// Load RSA private key from environment (PEM). In production, use KMS/HSM instead.
const RSA_PRIVATE_PEM = process.env.SEED_HANDLER_PRIVATE_PEM || null;
if(!RSA_PRIVATE_PEM){
  console.warn('SEED_HANDLER_PRIVATE_PEM not set — server will reject uploads. Set process env to enable.');
}

// Expose the public key for client-side encryption
app.get('/seed-public-key', (req,res)=>{
  if(!RSA_PRIVATE_PEM) return res.status(500).send('not-configured');
  // derive public key PEM from private
  try{
    const key = crypto.createPrivateKey(RSA_PRIVATE_PEM);
    const pub = key.export({ type: 'spki', format: 'pem' });
    res.type('text/plain').send(pub);
  }catch(e){ res.status(500).send('error'); }
});

// temporary storage directory (ciphertext only)
const TEMP_DIR = './data/seed-tmp';
if(!fs.existsSync(TEMP_DIR)) fs.mkdirSync(TEMP_DIR,{recursive:true});

app.post('/seed-upload', async (req,res)=>{
  if(!RSA_PRIVATE_PEM) return res.status(500).json({ error:'server not configured' });
  const { ciphertext, name } = req.body || {};
  if(!ciphertext) return res.status(400).json({ error:'missing ciphertext' });
  const id = uuidv4();
  const file = `${TEMP_DIR}/${id}.ct`;
  try{
    // Save ciphertext to temporary file (still encrypted)
    fs.writeFileSync(file, ciphertext, { encoding:'utf8', mode:0o600 });

    // Immediately process in ephemeral flow
    const result = await processCiphertext(file);

    // Respond and schedule secure deletion
    scheduleDelete(file, 0); // delete immediately
    res.json({ id, result });
  }catch(e){
    try{ scheduleDelete(file,0); }catch(e){}
    res.status(500).json({ error: e.message });
  }
});

async function processCiphertext(filePath){
  // read the base64 ciphertext
  const b64 = fs.readFileSync(filePath,'utf8');
  const buf = Buffer.from(b64, 'base64');

  // Decrypt using RSA-OAEP (server private key)
  const priv = crypto.createPrivateKey(RSA_PRIVATE_PEM);
  let plaintext;
  try{
    plaintext = crypto.privateDecrypt({ key: priv, padding: crypto.constants.RSA_PKCS1_OAEP_PADDING }, buf);
  }catch(e){
    throw new Error('failed to decrypt');
  }

  const seed = plaintext.toString('utf8');

  // IMPORTANT: do not persist seed or private key. Perform ephemeral operations here.
  // Example: derive the public address (placeholder) and return a result.
  // In production, call your HSM/KMS signing service here instead.

  // Example derive (NOT a real derivation) — replace with real crypto libs as needed.
  const addressHash = crypto.createHash('sha256').update(seed).digest('hex').slice(0,40);

  // Zeroize plaintext buffer
  plaintext.fill && plaintext.fill(0);

  // Return minimal result. Do NOT return the seed or key material.
  return { address: '0x'+addressHash, note: 'ephemeral-derivation-simulated' };
}

function scheduleDelete(path, seconds){
  setTimeout(()=>{
    try{ if(fs.existsSync(path)) fs.unlinkSync(path); }catch(e){}
  }, seconds*1000);
}

const port = process.env.SEED_HANDLER_PORT || 4000;
app.listen(port, ()=>console.log('seed-handler listening', port));

module.exports = app;
