const mongoose = require('mongoose');
const dotenv = require('dotenv');
const User = require('./models/User');
const Event = require('./models/Event');
const connectDB = require('./config/db');

dotenv.config();

const seedData = async () => {
    try {
        await connectDB();

        console.log('Enforcing strictly 3 Admins & 2 Organizers (Total 5 Accounts)...');

        const exact5Accounts = [
            // 3 ADMINS
            {
                name: 'Madhu (Admin)',
                email: 'madhu@gmail.com',
                phone: '+91 8088169018',
                password: '123@madhu',
                role: 'admin'
            },
            {
                name: 'System Admin',
                email: 'admin@eventhub.com',
                phone: '+91 9900000001',
                password: 'Admin@123',
                role: 'admin'
            },
            {
                name: 'Executive Admin',
                email: 'admin3@eventhub.com',
                phone: '+91 9900000003',
                password: 'Admin@123',
                role: 'admin'
            },
            // 2 ORGANIZERS
            {
                name: 'MadhuNM',
                email: '2303031240602@gmail.com',
                phone: '+91 8088169018',
                password: '123456',
                role: 'organizer'
            },
            {
                name: 'Tech Events Forum',
                email: 'organizer1@eventhub.com',
                phone: '+91 9900000002',
                password: 'Organizer@123',
                role: 'organizer'
            }
        ];

        const allowedEmails = exact5Accounts.map(a => a.email.toLowerCase());

        // Remove any extra admin/organizer accounts
        await User.deleteMany({
            role: { $in: ['admin', 'organizer'] },
            email: { $nin: allowedEmails }
        });

        for (const acc of exact5Accounts) {
            let u = await User.findOne({ email: acc.email });
            if (u) {
                u.name = acc.name;
                u.phone = acc.phone;
                u.password = acc.password;
                u.role = acc.role;
                await u.save();
            } else {
                await User.create(acc);
            }
        }

        const finalAccounts = await User.find({ role: { $in: ['admin', 'organizer'] } });
        console.log(`✅ Seed Complete: Total Accounts = ${finalAccounts.length} (3 Admins + 2 Organizers)`);
        process.exit();
    } catch (err) {
        console.error('Seed Error:', err);
        process.exit(1);
    }
};

seedData();
