require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');
const Community = require('./models/Community');
const Post = require('./models/Post');

const dummyUsers = [
    { username: 'rahul_dev', email: 'rahul_dev@dummy.com' },
    { username: 'priya_sharma', email: 'priya_sharma@dummy.com' },
    { username: 'amit_codes', email: 'amit_codes@dummy.com' },
    { username: 'neha_gupta', email: 'neha_gupta@dummy.com' },
    { username: 'rohit_webdev', email: 'rohit_webdev@dummy.com' },
    { username: 'sneha_ml', email: 'sneha_ml@dummy.com' },
    { username: 'vikram_js', email: 'vikram_js@dummy.com' },
    { username: 'anjali_ux', email: 'anjali_ux@dummy.com' },
    { username: 'karan_infra', email: 'karan_infra@dummy.com' },
    { username: 'pooja_react', email: 'pooja_react@dummy.com' },
    { username: 'arjun_py', email: 'arjun_py@dummy.com' },
    { username: 'divya_cloud', email: 'divya_cloud@dummy.com' }
];

const dummyCommunities = [
    { name: 'Desi Developers', description: 'India ka sabse bada developer community — yahan code bhi hota hai aur chai bhi.', pic: 'https://images.unsplash.com/photo-1517694712202-14dd9538aa97' },
    { name: 'AI & ML India', description: 'Artificial Intelligence, Machine Learning aur Data Science pe charcha.', pic: 'https://images.unsplash.com/photo-1555255707-c07966088b7b' },
    { name: 'Frontend Fanatics', description: 'React, Vue, CSS, animations — sab kuch frontend ka yahan hota hai.', pic: 'https://images.unsplash.com/photo-1498050108023-c5249f4df085' },
    { name: 'Startup India Tech', description: 'Indian startups, funding rounds, aur tech entrepreneurship.', pic: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71' },
    { name: 'Career & Jobs', description: 'Placements, interview prep, resume tips aur career growth.', pic: 'https://images.unsplash.com/photo-1522071820081-009f0129c71c' }
];

const images = [
    "https://images.unsplash.com/photo-1498050108023-c5249f4df085?w=800",
    "https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=800",
    "https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=800",
    "https://images.unsplash.com/photo-1518770660439-4636190af475?w=800",
    "https://images.unsplash.com/photo-1526304640581-d334cdbbf45e?w=800",
    "https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=800",
    "https://images.unsplash.com/photo-1504384308090-c894fdcc538d?w=800",
    "https://images.unsplash.com/photo-1534972195531-d756b9bfa9f2?w=800",
    "https://images.unsplash.com/photo-1461749280684-dccba630e2f6?w=800",
    "https://images.unsplash.com/photo-1542831371-29b0f74f9713?w=800",
    "https://images.unsplash.com/photo-1607799279861-4dd421887fb3?w=800",
    "https://images.unsplash.com/photo-1629654297299-c8506221ca97?w=800",
    "https://images.unsplash.com/photo-1580894894513-541e068a3e2b?w=800",
    "https://images.unsplash.com/photo-1573164713714-d95e436ab8d6?w=800",
    "https://images.unsplash.com/photo-1633356122102-3fe601e05bd2?w=800"
];

// All 10 posts are completely unique — no repeats
const allPosts = [
    // ---- Desi Developers (community index 0) ----
    { ci: 0, title: "Meri pehli open source PR merge ho gayi!", content: "6 mahine se try kar raha tha. Aaj finally React Router ke docs mein ek typo fix ki PR merge hui. Chhoti si cheez hai par feeling bohot achhi hai. Sabko recommend karunga — first PR ke liye docs repos best hain.", hasImage: true },
    { ci: 0, title: "Node.js vs Deno vs Bun — kaunsa seekhein 2026 mein?", content: "Bun ka hype bohot hai par Node.js ka ecosystem mature hai. Deno bhi achha hai par jobs mein Node hi maangta hai. Meri advice — pehle Node solid karo, baaki explore karte raho.", hasImage: false },

    // ---- AI & ML India (community index 1) ----
    { ci: 1, title: "Gemini 3.5 ka coding ability dekh ke maza aa gaya", content: "Aaj ek pura REST API Gemini se banwaya — models, routes, middleware sab. 30 min ka kaam 5 min mein ho gaya. Par haan, production mein blindly use mat karna, review zaroor karo.", hasImage: true },
    { ci: 1, title: "Hugging Face pe apna pehla model deploy kiya!", content: "Ek simple sentiment analysis model banaya tha college project ke liye. Hugging Face Spaces pe Gradio app bana ke deploy kar diya. Link share karunga, feedback dena.", hasImage: true },

    // ---- Frontend Fanatics (community index 2) ----
    { ci: 2, title: "Framer Motion ke animations dekh ke client khush ho gaya", content: "Ek landing page banaya tha freelance mein. Framer Motion se scroll animations aur page transitions daale. Client ne extra payment di kyunki itna smooth tha. Worth learning hai ye library.", hasImage: true },
    { ci: 2, title: "CSS mein center karna ab bhi mushkil lagta hai kya?", content: "display: grid; place-items: center; — bas ye ek line yaad rakh lo aur zindagi aasan ho jayegi. Flexbox wala method bhi theek hai par grid shortest hai.", hasImage: false },

    // ---- Startup India Tech (community index 3) ----
    { ci: 3, title: "Apna SaaS launch kiya — pehle din 0 signups 😅", content: "6 mahine lagaaye building mein. Launch kiya Product Hunt pe. Pehle din koi signup nahi hua. Par haar nahi maanunga — marketing seekhna padega ab.", hasImage: true },
    { ci: 3, title: "Bangalore mein co-working spaces bohot mehnge ho gaye", content: "WeWork mein ek seat ₹15,000/month maang rahe hain. Koi sasta par achha co-working space suggest karo Bangalore mein. HSR Layout ya Koramangala preferred.", hasImage: false },

    // ---- Career & Jobs (community index 4) ----
    { ci: 4, title: "TCS se resign kiya, ab kya karun?", content: "2 saal TCS mein kaam kiya. Kuch naya nahi seekh raha tha. Notice period mein hoon. Kya direct product companies mein apply karun ya pehle kuch projects banaaun?", hasImage: false },
    { ci: 4, title: "LinkedIn profile optimize karne ke tips", content: "Recruiter ne bola tera profile weak hai. Headline mein 'looking for opportunities' mat likho. Achhe se skills mention karo, projects ka link daalo, aur recommendations lo.", hasImage: true },
];

async function seedData() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log("Connected to MongoDB");

        // 1. Create dummy users
        const dbUsers = [];
        for (const u of dummyUsers) {
            let user = await User.findOne({ email: u.email });
            if (!user) {
                user = new User({
                    username: u.username,
                    email: u.email,
                    password: 'hashed_password_placeholder',
                    profilePic: `https://api.dicebear.com/9.x/avataaars/svg?seed=${u.username}`,
                    anubhav: Math.floor(Math.random() * 800) + 50
                });
                await user.save();
                console.log(`Created user: ${u.username}`);
            }
            dbUsers.push(user);
        }

        // 2. Create dummy communities
        const dbCommunities = [];
        for (const c of dummyCommunities) {
            let community = await Community.findOne({ name: c.name });
            if (!community) {
                community = new Community({
                    name: c.name,
                    description: c.description,
                    creator: dbUsers[Math.floor(Math.random() * dbUsers.length)]._id,
                    profilePic: c.pic,
                    bannerPic: 'https://images.unsplash.com/photo-1518770660439-4636190af475?w=1000',
                    members: dbUsers.map(u => u._id)
                });
                await community.save();
                console.log(`Created community: ${c.name}`);
            }
            dbCommunities.push(community);
        }

        // 3. Insert all 10 unique posts
        console.log("Generating 10 unique posts...");
        const postsToInsert = allPosts.map((post, index) => {
            const date = new Date();
            date.setDate(date.getDate() - Math.floor(Math.random() * 20));
            date.setHours(date.getHours() - Math.floor(Math.random() * 24));
            date.setMinutes(date.getMinutes() - Math.floor(Math.random() * 60));

            const author = dbUsers[Math.floor(Math.random() * dbUsers.length)];
            const community = dbCommunities[post.ci];

            // Random upvotes from 1-6 random users
            const numUpvotes = Math.floor(Math.random() * 6) + 1;
            const shuffled = [...dbUsers].sort(() => 0.5 - Math.random());
            const upvoters = shuffled.slice(0, numUpvotes).map(u => u._id);

            const result = {
                title: post.title,
                content: post.content,
                author: author._id,
                community: community._id,
                upvotes: upvoters,
                downvotes: [],
                createdAt: date,
                updatedAt: date,
                hotScore: Math.floor(Math.random() * 800) + 10
            };

            if (post.hasImage) {
                result.postType = 'media';
                result.media = [{ url: images[index % images.length], mimetype: 'image/jpeg' }];
            } else {
                result.postType = 'text';
            }

            return result;
        });

        const inserted = await Post.insertMany(postsToInsert);
        console.log(`Successfully inserted ${inserted.length} unique posts!`);

        console.log("\n=================================");
        console.log("Seed complete. Realistic Indian tech community data added.");
        console.log("To remove later: node deleteDummyPosts.js");
        console.log("=================================\n");

        process.exit(0);
    } catch (err) {
        console.error("Seeding error:", err);
        process.exit(1);
    }
}

seedData();
