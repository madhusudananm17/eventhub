const mongoose = require('mongoose');

const autoSeedAccounts = async () => {
    try {
        const User = require('../models/User');
        const exactAccounts = [
            { name: 'Madhu (Admin)', email: 'madhu@gmail.com', phone: '+91 8088169018', password: '123@madhu', role: 'admin' },
            { name: 'System Admin', email: 'admin@eventhub.com', phone: '+91 9900000001', password: 'Admin@123', role: 'admin' },
            { name: 'Executive Admin', email: 'admin3@eventhub.com', phone: '+91 9900000003', password: 'Admin@123', role: 'admin' },
            { name: 'MadhuNM', email: '2303031240602@gmail.com', phone: '+91 8088169018', password: '123456', role: 'organizer' },
            { name: 'Tech Events Forum', email: 'organizer1@eventhub.com', phone: '+91 9900000002', password: 'Organizer@123', role: 'organizer' },
            { name: 'Cultural & Sports Forum', email: 'organizer2@eventhub.com', phone: '+91 9900000003', password: 'Organizer@123', role: 'organizer' },
            { name: 'General Attendee', email: 'user@eventhub.com', phone: '+91 9900000004', password: 'User@123', role: 'user' }
        ];

        for (const acc of exactAccounts) {
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
        console.log('✅ Auto-seed accounts verified (3 Admins + 3 Organizers + Default User)');
    } catch(e) {
        console.error('AutoSeed Warning:', e.message);
    }
};

const connectDB = async () => {
    try {
        const conn = await mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/eventhub');
        console.log(`MongoDB Connected: ${conn.connection.host}`);
        await autoSeedAccounts();
    } catch (error) {
        console.error(`MongoDB Connection Error: ${error.message}`);
        console.log('Server continuing to run. Retrying MongoDB connection in 10 seconds...');
        setTimeout(connectDB, 10000);
    }
};

module.exports = connectDB;
