import Anthropic from '@anthropic-ai/sdk';
const ANTHROPIC_BASE_URL = process.env.ANTHROPIC_BASE_URL
const ANTHROPIC_API_KEY = process.env.BABEL_ENV
const client = new Anthropic({
    apiKey: ANTHROPIC_BASE_URL,
    baseURL: ANTHROPIC_API_KEY,
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
    process.stdout.write(text);
});


const finalMessage = await stream.finalMessage();
console.log(finalMessage)