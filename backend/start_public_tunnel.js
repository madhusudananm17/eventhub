const localtunnel = require('localtunnel');
const fs = require('fs');
const path = require('path');

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

(async () => {
    try {
        console.log('🌐 Requesting a Public Tunnel URL for Frontend Port 3000...');
        const tunnel = await localtunnel({ port: 3000 });

        console.log('\n================================================================');
        console.log('🚀 PUBLIC MOBILE ACCESSIBLE URL GENERATED FOR EVENTHUB:');
        console.log(`🔗 Public URL: ${tunnel.url}`);
        console.log('================================================================\n');

        // Update .env file with FRONTEND_URL
        const envPath = path.join(__dirname, '.env');
        let envContent = '';
        if (fs.existsSync(envPath)) {
            envContent = fs.readFileSync(envPath, 'utf8');
        }

        if (envContent.includes('FRONTEND_URL=')) {
            envContent = envContent.replace(/FRONTEND_URL=.*/g, `FRONTEND_URL=${tunnel.url}`);
        } else {
            envContent += `\nFRONTEND_URL=${tunnel.url}\n`;
        }

        fs.writeFileSync(envPath, envContent, 'utf8');
        console.log(`✅ Updated backend/.env with FRONTEND_URL=${tunnel.url}`);

        tunnel.on('close', () => {
            console.log('Tunnel closed.');
        });
    } catch (err) {
        console.error('Error starting public tunnel:', err);
    }
})();
