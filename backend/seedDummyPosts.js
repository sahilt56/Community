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

// All 50 posts are completely unique — no repeats
const allPosts = [
    // ---- Desi Developers (community index 0) ----
    { ci: 0, title: "Meri pehli open source PR merge ho gayi!", content: "6 mahine se try kar raha tha. Aaj finally React Router ke docs mein ek typo fix ki PR merge hui. Chhoti si cheez hai par feeling bohot achhi hai. Sabko recommend karunga — first PR ke liye docs repos best hain.", hasImage: true },
    { ci: 0, title: "Kya aap log bhi mass layoffs se dare hue ho?", content: "Mere office mein kal 40 log nikaale gaye. Mujhe nahi nikala par ab darr lag raha hai. Kya koi backup plan banana chahiye? Freelancing ya kuch side project?", hasImage: false },
    { ci: 0, title: "VS Code ki jagah Cursor IDE try karo — mind blowing hai", content: "Pichle hafte se Cursor use kar raha hoon. AI autocomplete itna achha hai ki code likhne ki speed double ho gayi. VS Code jaisa hi interface hai toh shift karna easy tha. Kya aap logon ne try kiya?", hasImage: true },
    { ci: 0, title: "Weekend project: Zomato jaisa UI clone banaya React mein", content: "Sirf frontend hai, backend nahi lagaya abhi. Tailwind + Framer Motion use kiya hai animations ke liye. Restaurant cards, search bar, filters — sab kaam kar raha hai. GitHub link comments mein dalunga.", hasImage: true },
    { ci: 0, title: "Ek saal pehle coding start ki thi, aaj tak ka journey", content: "HTML se shuru kiya, phir JS, React, Node seekha. 3 projects banaye, 2 freelance kaam mile. Abhi tak koi full-time job nahi mili par haar nahi maanunga. Ye post un logon ke liye hai jo abhi shuru kar rahe hain.", hasImage: false },
    { ci: 0, title: "Git rebase vs merge — simple explanation dedo please", content: "Main bas git add, commit, push jaanta hoon. Ab team mein kaam karna hai toh rebase aur merge ka concept samajhna padega. Koi achhe se samjha do with example.", hasImage: false },
    { ci: 0, title: "India mein best tech conferences 2026?", content: "ReactIndia aur JSConf ke baare mein suna hai. Koi aur achhe conferences hain jo attend karne chahiye? Networking ke liye jaana chahta hoon.", hasImage: true },
    { ci: 0, title: "MongoDB Atlas free tier ka 512MB khatam ho gaya", content: "Mere college project ka DB full ho gaya. Kya koi free alternative hai ya paid plan lena padega? Students ke liye koi discount milta hai kya Atlas pe?", hasImage: false },
    { ci: 0, title: "Dark mode implement karna itna mushkil kyun hai?", content: "CSS variables se kar raha hoon par har component mein manually check karna pad raha hai. Kya koi achha pattern hai React mein dark mode ke liye jo scalable ho?", hasImage: true },
    { ci: 0, title: "Kisi ne Bun.js production mein use kiya hai?", content: "Node.js ka alternative hai, bohot fast hai benchmarks mein. Par kya actually stable hai production ke liye? Ya abhi sirf experiments ke liye theek hai?", hasImage: false },

    // ---- AI & ML India (community index 1) ----
    { ci: 1, title: "Gemini 3.5 ka coding ability dekh ke maza aa gaya", content: "Aaj ek pura REST API Gemini se banwaya — models, routes, middleware sab. 30 min ka kaam 5 min mein ho gaya. Par haan, production mein blindly use mat karna, review zaroor karo.", hasImage: true },
    { ci: 1, title: "Hugging Face pe apna pehla model deploy kiya!", content: "Ek simple sentiment analysis model banaya tha college project ke liye. Hugging Face Spaces pe Gradio app bana ke deploy kar diya. Link share karunga, feedback dena.", hasImage: true },
    { ci: 1, title: "Machine Learning ke liye laptop mein GPU zaroori hai kya?", content: "Mera budget limited hai. Kya Google Colab se kaam chal jayega ya GPU wala laptop lena hi padega ML seekhne ke liye?", hasImage: false },
    { ci: 1, title: "RAG (Retrieval Augmented Generation) ka simple tutorial chahiye", content: "Har jagah RAG RAG ho raha hai par koi achhe se samjhata nahi. Kya koi step by step guide de sakta hai? LangChain use karna hai.", hasImage: true },
    { ci: 1, title: "AI se generated art ko NFT bana ke bech sakte hain kya?", content: "DALL-E aur Midjourney se kuch achhe images generate kiye. Kya inko legally bech sakte hain? Copyright issues toh nahi aayenge?", hasImage: true },
    { ci: 1, title: "Data Science vs Web Dev — salary comparison India mein", content: "Dono fields mein interested hoon. 0-3 years experience mein kismein zyada package milta hai India mein? Koi real numbers share kar sakta hai?", hasImage: false },
    { ci: 1, title: "OpenAI ka API bohot mehenga pad raha hai", content: "Side project mein ChatGPT API use kar raha hoon. Monthly bill $40+ aa raha hai sirf development mein. Koi sasta alternative hai? Ollama ya local LLM chalega kya?", hasImage: false },
    { ci: 1, title: "Computer Vision se traffic monitoring project banaya", content: "YOLO v8 use karke vehicles count kar raha hoon webcam feed se. Indian roads pe accuracy 78% aa rahi hai. Koi tips hain accuracy badhane ke liye?", hasImage: true },
    { ci: 1, title: "Kaggle competitions mein participate kaise karein?", content: "Profile bana li hai Kaggle pe par samajh nahi aa raha kahan se shuru karun. Kya pehle courses karoon ya directly competition join karun?", hasImage: false },
    { ci: 1, title: "ChatGPT wrapper apps ka future kya hai?", content: "Bohot saari companies bas ChatGPT ke upar UI laga ke product bana rahi hain. Kya ye sustainable hai ya OpenAI khud inko replace kar dega?", hasImage: false },

    // ---- Frontend Fanatics (community index 2) ----
    { ci: 2, title: "Framer Motion ke animations dekh ke client khush ho gaya", content: "Ek landing page banaya tha freelance mein. Framer Motion se scroll animations aur page transitions daale. Client ne extra payment di kyunki itna smooth tha. Worth learning hai ye library.", hasImage: true },
    { ci: 2, title: "CSS mein center karna ab bhi mushkil lagta hai kya?", content: "display: grid; place-items: center; — bas ye ek line yaad rakh lo aur zindagi aasan ho jayegi. Flexbox wala method bhi theek hai par grid shortest hai.", hasImage: false },
    { ci: 2, title: "React 19 ke naye hooks use kiye kisi ne?", content: "useOptimistic aur useFormStatus try kiya hai kisi ne? Mujhe form handling mein kaam aayenge ye dono. Koi real-world example share karo.", hasImage: true },
    { ci: 2, title: "Mere portfolio site ko roast karo please 🔥", content: "Naya portfolio banaya hai Next.js + Tailwind se. Honest feedback chahiye — design, content, performance sab pe. Link comments mein hai. Bura lagega par improvement hoga!", hasImage: true },
    { ci: 2, title: "SVG animations banane ka sabse easy tool?", content: "Logo ko animate karna hai website ke liye. GSAP, Lottie, ya pure CSS — kaunsa sabse achha rahega? Mujhe simple fade-in aur draw effect chahiye.", hasImage: false },
    { ci: 2, title: "Next.js App Router vs Pages Router — kaunsa seekhun?", content: "Naya project start karna hai. Internet pe dono ke tutorials hain. Kya App Router stable ho gaya hai ya abhi Pages Router safe choice hai?", hasImage: false },
    { ci: 2, title: "Tailwind CSS v4 mein kya naya aaya hai?", content: "Suna hai configuration system pura badal gaya hai. Kya existing projects ko migrate karna mushkil hoga? Kisi ne upgrade kiya hai kya?", hasImage: true },
    { ci: 2, title: "Accessibility (a11y) ko ignore mat karo — serious topic hai", content: "Mere ek project mein screen reader support nahi tha. Client ne reject kar diya. Tab se har project mein ARIA labels aur keyboard navigation implement karta hoon.", hasImage: false },
    { ci: 2, title: "Chrome DevTools ke hidden features jo sabko pata hone chahiye", content: "Performance tab se memory leaks dhundho, Network tab mein throttling lagao, Elements mein force state (hover/focus) — ye sab shortcuts jaante ho?", hasImage: true },
    { ci: 2, title: "Figma se React component banana — mera workflow", content: "Pehle Figma mein design karta hoon, phir component structure plan karta hoon, phir code. Auto Layout = Flexbox samajh lo. Is approach se speed 3x badh gayi.", hasImage: true },

    // ---- Startup India Tech (community index 3) ----
    { ci: 3, title: "Apna SaaS launch kiya — pehle din 0 signups 😅", content: "6 mahine lagaaye building mein. Launch kiya Product Hunt pe. Pehle din koi signup nahi hua. Par haar nahi maanunga — marketing seekhna padega ab.", hasImage: true },
    { ci: 3, title: "Bangalore mein co-working spaces bohot mehnge ho gaye", content: "WeWork mein ek seat ₹15,000/month maang rahe hain. Koi sasta par achha co-working space suggest karo Bangalore mein. HSR Layout ya Koramangala preferred.", hasImage: false },
    { ci: 3, title: "Razorpay integration karte waqt ye galtiyan mat karna", content: "Webhook signature verification skip mat karo, test mode mein sab kuch check karo pehle, aur payment failure handling zaroor likho. Mujhe ye galtiyan kar ke seekhna pada.", hasImage: true },
    { ci: 3, title: "Kya solo founder ke liye funding milti hai India mein?", content: "Co-founder nahi hai. Kya angel investors solo founders ko fund karte hain? Ya pehle revenue generate karna zaroori hai?", hasImage: false },
    { ci: 3, title: "AWS ka bill dekh ke haath kaamp gaye", content: "EC2 instance band karna bhool gaya tha. 3 hafte baad $200 ka bill aa gaya. Ab billing alerts set kar diye hain. Beginners please ye galti mat karna!", hasImage: false },
    { ci: 3, title: "Indian startup founders ko ye 5 tools use karne chahiye", content: "1. Notion (docs), 2. Linear (project management), 3. Crisp (customer chat), 4. Plausible (analytics), 5. Resend (emails). Sab affordable hain startups ke liye.", hasImage: true },
    { ci: 3, title: "Mere product ka MRR $500 cross kar gaya!", content: "8 mahine lage first paying customer laane mein. Ab slowly grow ho raha hai. Patience aur consistent marketing key hai. AMA (Ask Me Anything) kar sakte hain.", hasImage: true },
    { ci: 3, title: "Tech stack decision mein overthinking band karo", content: "Maine 2 mahine tech stack decide karne mein waste kiye. React ya Vue? Postgres ya Mongo? Bhai jo aata hai usme bana do — users ko tech stack se matlab nahi hai.", hasImage: false },
    { ci: 3, title: "Product Hunt pe launch karne ka sahi tarika", content: "Tuesday ya Wednesday ko launch karo, morning 12:01 AM PST pe. Pehle se community build karo. Launch day pe personally sabko message karo. Ye strategy kaam karti hai.", hasImage: true },
    { ci: 3, title: "Legal structure: Pvt Ltd vs LLP vs Sole Proprietorship?", content: "Startup register karna hai India mein. CA ne Pvt Ltd bola par cost zyada hai. LLP sasta hai. Kya sahi rahega ek SaaS product ke liye? Experienced founders batao.", hasImage: false },

    // ---- Career & Jobs (community index 4) ----
    { ci: 4, title: "TCS se resign kiya, ab kya karun?", content: "2 saal TCS mein kaam kiya. Kuch naya nahi seekh raha tha. Notice period mein hoon. Kya direct product companies mein apply karun ya pehle kuch projects banaaun?", hasImage: false },
    { ci: 4, title: "LinkedIn profile optimize karne ke tips", content: "Recruiter ne bola tera profile weak hai. Headline mein 'looking for opportunities' mat likho. Achhe se skills mention karo, projects ka link daalo, aur recommendations lo.", hasImage: true },
    { ci: 4, title: "Interview mein 'Tell me about yourself' ka perfect answer", content: "Ye sawal har interview mein aata hai. 2 min ka answer rakho — background, current role, why this company. Ratta mat maaro, naturally bolo. Practice karo mirror ke saamne.", hasImage: false },
    { ci: 4, title: "Remote job mil gayi US company mein — tips share kar raha hoon", content: "6 mahine lagaye. 50+ applications diye, 8 interviews hue, 2 offers aaye. Key tha: strong GitHub profile, achha LinkedIn, aur DSA + System Design dono prepare karna.", hasImage: true },
    { ci: 4, title: "Fresher salary: ₹3 LPA accept karun ya nahi?", content: "Tier-2 college se hoon. Ek service company ne ₹3 LPA offer kiya hai. Kya ye accept karna chahiye ya wait karun better offer ke liye? Experience milega par salary kam hai.", hasImage: false },
    { ci: 4, title: "System Design interviews mein kya poochte hain?", content: "SDE-2 level pe apply kar raha hoon. System Design round se darr lagta hai. Kya topics cover karun? URL shortener, chat system, notification system — ye aate hain kya?", hasImage: true },
    { ci: 4, title: "Burnout ho gaya hai — 2 hafte ki chutti chahiye", content: "Roz 10-12 ghante kaam kar raha hoon pichle 6 mahine se. Ab code dekhne ka mann nahi karta. Manager se baat karun ya directly leave apply karun?", hasImage: false },
    { ci: 4, title: "College placements mein CGPA matter karta hai kya?", content: "Mera CGPA 7.2 hai. Kuch companies 7.5 cutoff rakhti hain. Kya coding skills se compensate ho sakta hai ya CGPA improve karna padega?", hasImage: false },
    { ci: 4, title: "Freelancing se ₹50,000/month kama raha hoon — journey share", content: "Pehle ₹5000 ke projects karta tha. Ab ₹50K/month aa raha hai consistently. Secret: ek niche choose karo (mera React dashboards hai), portfolio banao, aur LinkedIn pe active raho.", hasImage: true },
    { ci: 4, title: "Offer letter mein ye 5 cheezein zaroor check karo", content: "1. CTC vs in-hand salary, 2. Notice period, 3. Bond clause, 4. Variable pay percentage, 5. Health insurance details. Maine ek baar bina padhe sign kiya tha — bohot pachhtaya.", hasImage: true }
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

        // 3. Insert all 50 unique posts
        console.log("Generating 50 unique posts...");
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
