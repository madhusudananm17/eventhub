const localtunnel = require('localtunnel');
const fs = require('fs');
const path = require('path');

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

(async () => {
    try {
        console.log('🌐 Creating Global Public Tunnel for EventHub Frontend (Port 3000)...');
        
        // Connect localtunnel for Frontend
        const frontendTunnel = await localtunnel({ port: 3000 });
        console.log(`\n================================================================`);
        console.log(`🌍 PUBLIC GLOBAL FRONTEND URL (Accessible on any device & network worldwide):`);
        console.log(`👉 ${frontendTunnel.url}`);
        console.log(`================================================================\n`);

        // Connect localtunnel for Backend API (Port 5000)
        const backendTunnel = await localtunnel({ port: 5000 });
        console.log(`\n================================================================`);
        console.log(`⚙️ PUBLIC GLOBAL BACKEND API URL:`);
        console.log(`👉 ${backendTunnel.url}`);
        console.log(`================================================================\n`);

        // Update .env with FRONTEND_URL
        const envPath = path.join(__dirname, '.env');
        if (fs.existsSync(envPath)) {
            let envContent = fs.readFileSync(envPath, 'utf8');
            if (envContent.includes('FRONTEND_URL=')) {
                envContent = envContent.replace(/FRONTEND_URL=.*/g, `FRONTEND_URL=${frontendTunnel.url}`);
            } else {
                envContent += `\nFRONTEND_URL=${frontendTunnel.url}\n`;
            }
            fs.writeFileSync(envPath, envContent, 'utf8');
            console.log(`✅ Configured FRONTEND_URL=${frontendTunnel.url} in backend/.env`);
        }

        frontendTunnel.on('close', () => console.log('Frontend tunnel closed.'));
        backendTunnel.on('close', () => console.log('Backend tunnel closed.'));
    } catch (err) {
        console.error('❌ Tunnel error:', err.message);
    }
})();
