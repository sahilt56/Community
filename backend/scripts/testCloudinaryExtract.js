const { deleteFromCloudinary } = require('../utils/cloudinary');

const testUrls = [
  'https://res.cloudinary.com/reddit_clone/image/upload/v1234567/reddit_clone/1741696512345-myfile.jpg',
  'http://res.cloudinary.com/reddit_clone/image/upload/reddit_clone/1741696512345-myfile.png',
  'https://res.cloudinary.com/demo/image/upload/sample.jpg',
  'https://res.cloudinary.com/demo/image/upload/v1/sample.jpg'
];

const mockDestroy = (id) => console.log(`[MOCK] Destroying: ${id}`);

// Manual monkey patch for testing logic without making real API calls if keys aren't set
const testExtraction = () => {
  console.log('--- Testing public_id Extraction Logic ---');
  const regex = /\/upload\/(?:v\d+\/)?(.+)\.[a-z]+$/;
  
  testUrls.forEach(url => {
    const match = url.match(regex);
    if (match && match[1]) {
      console.log(`URL: ${url}`);
      console.log(`Extracted: ${match[1]}`);
      console.log('---');
    } else {
      console.log(`URL: ${url}`);
      console.log('FAILED to extract');
      console.log('---');
    }
  });
};

testExtraction();
