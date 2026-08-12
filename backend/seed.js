const mongoose = require('mongoose');
const dotenv = require('dotenv');
const User = require('./models/User');
const Event = require('./models/Event');
const Registration = require('./models/Registration');
const connectDB = require('./config/db');

dotenv.config();

const seedData = async () => {
    try {
        await connectDB();

        console.log('Seeding database with required test accounts...');

        // 1. Madhu Admin Account
        let madhuAdmin = await User.findOne({ email: 'madhu@gmail.com' });
        if (madhuAdmin) {
            madhuAdmin.password = '123@madhu';
            madhuAdmin.role = 'admin';
            await madhuAdmin.save();
            console.log(' - Updated Admin: madhu@gmail.com / 123@madhu');
        } else {
            madhuAdmin = await User.create({
                name: 'Madhu (Admin)',
                email: 'madhu@gmail.com',
                phone: '+91 8088169018',
                password: '123@madhu',
                role: 'admin'
            });
            console.log(' - Created Admin: madhu@gmail.com / 123@madhu');
        }

        // Default Admin Account
        let admin = await User.findOne({ email: 'admin@eventhub.com' });
        if (admin) {
            admin.password = 'Admin@123';
            await admin.save();
        } else {
            admin = await User.create({
                name: 'System Admin',
                email: 'admin@eventhub.com',
                phone: '+91 9900000001',
                password: 'Admin@123',
                role: 'admin'
            });
        }

        // 2. Organizer Accounts
        let org1 = await User.findOne({ email: 'organizer1@eventhub.com' });
        if (org1) {
            org1.password = 'Organizer@123';
            await org1.save();
        } else {
            org1 = await User.create({
                name: 'Tech Events Forum',
                email: 'organizer1@eventhub.com',
                phone: '+91 9900000002',
                password: 'Organizer@123',
                role: 'organizer'
            });
        }

        let org2 = await User.findOne({ email: 'organizer2@eventhub.com' });
        if (org2) {
            org2.password = 'Organizer@123';
            await org2.save();
        } else {
            org2 = await User.create({
                name: 'Karnataka Cultural & Sports',
                email: 'organizer2@eventhub.com',
                phone: '+91 9900000003',
                password: 'Organizer@123',
                role: 'organizer'
            });
        }

        // 3. User Accounts
        let user1 = await User.findOne({ email: 'user1@eventhub.com' });
        if (user1) {
            user1.password = 'User@123456';
            await user1.save();
        } else {
            user1 = await User.create({
                name: 'Rahul Kumar',
                email: 'user1@eventhub.com',
                phone: '+91 9900000004',
                password: 'User@123456',
                role: 'user'
            });
        }

        let user2 = await User.findOne({ email: 'user2@eventhub.com' });
        if (user2) {
            user2.password = 'User@123456';
            await user2.save();
        } else {
            user2 = await User.create({
                name: 'Priya Sharma',
                email: 'user2@eventhub.com',
                phone: '+91 9900000005',
                password: 'User@123456',
                role: 'user'
            });
        }

        let user3 = await User.findOne({ email: 'user3@eventhub.com' });
        if (user3) {
            user3.password = 'User@123456';
            await user3.save();
        } else {
            user3 = await User.create({
                name: 'Anand V',
                email: 'user3@eventhub.com',
                phone: '+91 9900000006',
                password: 'User@123456',
                role: 'user'
            });
        }

        // 4. Sample Events
        const sampleEventsData = [
            {
                title: 'Tech Conference 2026',
                description: 'Join industry leaders and innovators for a deep dive into AI, Cloud Computing, and modern Software Architecture in Bengaluru.',
                category: 'Technology',
                date: new Date('2026-08-25'),
                time: '10:00 AM',
                location: 'Bengaluru',
                venue: 'NIMHANS Convention Centre',
                price: 499,
                icon: '💻',
                organizer: org1._id,
                capacity: 200,
                availableSeats: 199
            },
            {
                title: 'Web Development Workshop',
                description: 'Hands-on practical workshop covering Full-Stack JavaScript, Node.js, Express, MongoDB and UI frameworks in Mysuru.',
                category: 'Education',
                date: new Date('2026-09-05'),
                time: '09:30 AM',
                location: 'Mysuru',
                venue: 'University Science Auditorium',
                price: 299,
                icon: '🎓',
                organizer: org1._id,
                capacity: 100,
                availableSeats: 100
            },
            {
                title: 'Summer Music Festival',
                description: 'An exciting live music event featuring top local bands and electronic music producers on Panambur Beach Grounds.',
                category: 'Music',
                date: new Date('2026-08-30'),
                time: '06:00 PM',
                location: 'Mangaluru',
                venue: 'Panambur Beach Grounds',
                price: 799,
                icon: '🎵',
                organizer: org2._id,
                capacity: 500,
                availableSeats: 500
            },
            {
                title: 'Cultural Heritage Festival',
                description: 'Grand cultural festival celebrating Karnataka folk arts, music, dance and traditional cuisine in Chikkaballapur.',
                category: 'Cultural',
                date: new Date('2026-09-25'),
                time: '05:00 PM',
                location: 'Chikkaballapur',
                venue: 'District Cultural Auditorium',
                price: 0,
                icon: '🎨',
                organizer: org2._id,
                capacity: 300,
                availableSeats: 300
            }
        ];

        for (const evData of sampleEventsData) {
            let existingEv = await Event.findOne({ title: evData.title });
            if (!existingEv) {
                await Event.create(evData);
            }
        }

        console.log('Database seeding process completed successfully!');
        process.exit(0);
    } catch (error) {
        console.error('Seeding error:', error);
        process.exit(1);
    }
};

seedData();
