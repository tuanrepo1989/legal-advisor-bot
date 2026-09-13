require('dotenv').config();
const { Telegraf, Markup } = require('telegraf');
const express = require('express');
const { GoogleGenerativeAI } = require('@google/generative-ai');

const token = process.env.TELEGRAM_TOKEN;
const geminiApiKey = process.env.GEMINI_API_KEY;

if (!token || !geminiApiKey) {
    console.error('Lỗi: Cần cung cấp biến môi trường TELEGRAM_TOKEN và GEMINI_API_KEY');
    process.exit(1);
}

const bot = new Telegraf(token);

// Khởi tạo Gemini AI (dùng model 2.5 flash chạy trơn tru, tốc độ cao)
const genAI = new GoogleGenerativeAI(geminiApiKey);
const aiModel = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

// ==========================================
// HỆ THỐNG LUẬT SƯ AI (GEMINI)
// ==========================================
async function getLegalAdviceFromAI(question) {
    try {
        const prompt = `
Bạn là một Luật sư chuyên nghiệp tại Việt Nam.
Nhiệm vụ của bạn là tư vấn pháp luật cho khách hàng dựa trên tình huống của họ.

Yêu cầu phong cách:
1. Trả lời đầy đủ, chuyên sâu, cặn kẽ. Tóm tắt lại nội dung các điều luật bằng lời văn của bạn.
2. Trích dẫn số hiệu Điều, Khoản, Tên Luật áp dụng.
3. VÍ DỤ/ÁN LỆ THỰC TẾ: Đưa ra 1 ví dụ hoặc án lệ thực tế liên quan, kèm 1 đường link URL (như VnExpress, thư viện pháp luật) để kiểm chứng.
4. Xưng "Tôi" (Luật sư) và gọi người hỏi là "Bạn/Quý khách".
5. Nếu câu hỏi không liên quan đến pháp luật Việt Nam, hãy lịch sự từ chối.
6. Kết thúc bằng câu: "Nếu cần tư vấn sâu hơn, vui lòng ấn nút Liên hệ Luật sư bên dưới."

Câu hỏi của khách hàng: "${question}"
`;

        const result = await aiModel.generateContent(prompt);
        return result.response.text();
    } catch (error) {
        console.error('Lỗi khi gọi Gemini AI:', error);
        return `⚠️ <b>Đang quá tải tra cứu!</b>\n\nXin lỗi bạn, hồ sơ đang bị kẹt mạng (Lỗi từ hệ thống Google AI). Bạn vui lòng đợi 30 giây rồi gửi lại câu hỏi, hoặc bấm "Liên hệ Luật sư" ở dưới nhé!`;
    }
}

// ==========================================
// XỬ LÝ LỆNH BOT
// ==========================================
const menuKeyboard = Markup.keyboard([
    ['🗂 Hỏi đáp Pháp luật', '🏢 Dịch vụ công 2026'],
    ['📞 Liên hệ Luật sư']
]).resize().persistent();

bot.start((ctx) => {
    ctx.reply(
        `🏛 <b>Chào mừng đến với Trợ Lý Luật Sư AI TuanRepo!</b> \n\nTôi là Luật sư AI được huấn luyện chuyên sâu về Pháp luật Việt Nam. Bạn có thể chọn các mục bên dưới hoặc gõ trực tiếp câu hỏi vào đây.`,
        { parse_mode: 'HTML', ...menuKeyboard }
    );
});

bot.hears('📞 Liên hệ Luật sư', (ctx) => {
    ctx.reply('👨‍⚖️ <b>Văn phòng Luật TuanRepo</b>\n📞 Hotline: 09xx.xxx.xxx\n📍 Địa chỉ: TP.HCM\n✉️ Trợ lý sẽ liên hệ lại với bạn trong vòng 2h làm việc để xếp lịch hẹn!', { parse_mode: 'HTML' });
});

bot.hears('🗂 Hỏi đáp Pháp luật', (ctx) => {
    ctx.reply('✍️ Mời bạn gõ ngay câu hỏi hoặc tình huống tranh chấp (Ví dụ: Ly hôn, đất đai, lao động...), tôi sẽ tư vấn cặn kẽ ngay!');
});

bot.hears('🏢 Dịch vụ công 2026', (ctx) => {
    ctx.reply(
        `🏢 <b>HƯỚNG DẪN DỊCH VỤ CÔNG TRỰC TUYẾN 2026</b>\n\n` +
        `Bạn đang muốn thực hiện thủ tục gì trên Cổng Dịch vụ công Quốc gia?\n` +
        `<i>(Ví dụ: "Cách đăng ký khai sinh online", "Thủ tục sang tên sổ đỏ", "Xin cấp hộ chiếu trực tuyến", "Cấp lại CCCD bị mất"...)</i>\n\n` +
        `👉 <b>Hãy gõ câu hỏi của bạn xuống dưới</b>, tôi sẽ hướng dẫn từng bước click chuột, các loại giấy tờ cần scan mã VNeID và đóng phí ra sao!`,
        { parse_mode: 'HTML' }
    );
});

// Xử lý mọi tin nhắn text khác
bot.on('text', async (ctx) => {
    const text = ctx.message.text;

    // Báo cho người dùng biết bot đang soạn tin
    await ctx.replyWithChatAction('typing');
    const waitMsg = await ctx.reply('⏳ Luật sư đang tra cứu hồ sơ và phân tích tình huống... (Khoảng 3-5 giây)');

    // Gọi AI
    const answer = await getLegalAdviceFromAI(text);

    // Xóa tin nhắn chờ
    await ctx.telegram.deleteMessage(ctx.chat.id, waitMsg.message_id).catch(() => {});

    // Gửi câu trả lời
    try {
        // Chia nhỏ tin nhắn nếu quá dài (giới hạn Telegram là 4096 ký tự)
        const MAX_LENGTH = 3900;
        let textToSend = answer;

        while (textToSend.length > 0) {
            let part = textToSend.substring(0, MAX_LENGTH);
            textToSend = textToSend.substring(MAX_LENGTH);

            try {
                await ctx.reply(part, { parse_mode: 'Markdown' });
            } catch (e) {
                // Nếu lỗi Markdown thì xoá thẻ và gửi text thường
                const cleanPart = part.replace(/[_*[\]()~`>#+\-=|{}.!]/g, '\\$&'); // Escape đặc kí tự Markdown
                await ctx.reply(part.replace(/\*\*/g, '').replace(/\*/g, ''));
            }
        }
    } catch (e) {
        console.error('Lỗi khi gửi tin nhắn:', e);
        await ctx.reply('⚠️ Có lỗi xảy ra khi gửi tin nhắn, vui lòng thử lại sau.');
    }
});

// ==========================================
// MÁY CHỦ WEB (CHO RENDER)
// ==========================================
const app = express();
const PORT = process.env.PORT || 3000;
app.get('/', (req, res) => res.send('AI Legal Advisor Bot is running'));
app.listen(PORT, () => console.log(`Server health-check running on port ${PORT}`));

bot.launch().then(() => {
    console.log('✅ AI Legal Advisor Bot started!');
    bot.telegram.setMyCommands([
        { command: 'start', description: '🏛 Khởi động lại Luật sư AI' }
    ]).catch(()=> {});
}).catch(console.error);

process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
