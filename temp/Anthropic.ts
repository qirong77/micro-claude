import Anthropic from '@anthropic-ai/sdk';
const ANTHROPIC_BASE_URL = process.env.ANTHROPIC_BASE_URL
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY
const client = new Anthropic({
    apiKey: ANTHROPIC_API_KEY,
    baseURL: ANTHROPIC_BASE_URL,
});
const message = await client.messages.create({
    max_tokens: 1024,
    messages: [{ role: 'user', content: '你是什么模型？' }],
    model: 'claude-sonnet-4-6',
});
const stream = client.messages.stream({
    max_tokens: 1024,
    messages: [{
        role: 'user',
        content: '你是什么模型?'
    }],
    model: 'claude-sonnet-4-6',
})

stream.on("text", (text) => {
    console.log(text)
    // process.stdout.write(text);
});


const finalMessage = await stream.finalMessage();
console.log(finalMessage)