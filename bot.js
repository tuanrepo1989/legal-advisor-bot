require('dotenv').config();
const { Telegraf, Markup } = require('telegraf');
const express = require('express');

const token = process.env.TELEGRAM_TOKEN;
if (!token) {
    console.error('Lỗi: Cần cung cấp biến môi trường TELEGRAM_TOKEN');
    process.exit(1);
}

const bot = new Telegraf(token);

// ==========================================
// CẤU TRÚC DỮ LIỆU LUẬT (Tạm thời)
// ==========================================
// Bản gốc này mình thiết lập để trả lời theo từ khóa.
// Về sau, bạn chỉ cần thay hàm getLegalAdvice này bằng hàm gọi API của AI (như ChatGPT hoặc Claude) là nó tự thông minh!
function getLegalAdvice(question) {
    const q = question.toLowerCase();

    if (q.includes('giao thông') || q.includes('phạt') || q.includes('nồng độ cồn')) {
        return `🚔 <b>Tư vấn Luật Giao Thông:</b>\n- Theo Nghị định 100/2019/NĐ-CP (sửa đổi tại 123/2021/NĐ-CP), mức phạt nồng độ cồn đối với xe máy là từ 2 - 8 triệu đồng, tước bằng từ 10 - 24 tháng.\n- Ô tô: Phạt từ 6 - 40 triệu đồng, tước bằng 10 - 24 tháng.`;
    }
    else if (q.includes('lao động') || q.includes('lương') || q.includes('sa thải')) {
        return `💼 <b>Tư vấn Luật Lao Động:</b>\n- Khách hàng lưu ý: Theo quy định BLLĐ 2019, người sử dụng lao động đơn phương chấm dứt hợp đồng trái pháp luật phải bồi thường ít nhất 2 tháng tiền lương.\n- Thử việc hưởng ít nhất 85% lương chính thức.`;
    }
    else if (q.includes('ly hôn') || q.includes('tài sản') || q.includes('hôn nhân')) {
        return `💍 <b>Tư vấn Luật Hôn nhân & Gia đình:</b>\n- Tài sản hình thành trong thời kỳ hôn nhân là tài sản chung (trừ đồ dùng sinh hoạt cá nhân thiết yếu hoặc tài sản được tặng cho riêng/thừa kế riêng).\n- Trẻ em dưới 36 tháng tuổi được giao cho mẹ trực tiếp nuôi, trừ trường hợp người mẹ không đủ điều kiện.`;
    }
    else {
        return `⚖️ <b>Hệ thống Tư vấn:</b>\nHiện tại tôi có thể cung cấp các trích lục về:\n1️⃣ Luật Giao Thông\n2️⃣ Luật Lao Động\n3️⃣ Tranh chấp Hôn nhân & Gia đình.\n\n<i>=> Vui lòng nhập từ khóa bạn quan tâm. (Sắp tới, tôi sẽ được nâng cấp lên AI để trò chuyện tự nhiên với bạn!)</i>`;
    }
}

// ==========================================
// XỬ LÝ LỆNH BOT
// ==========================================
const menuKeyboard = Markup.keyboard([
    ['🚔 Giao thông', '💼 Lao động'],
    ['💍 Hôn nhân', '📞 Liên hệ Luật sư']
]).resize().persistent();

bot.start((ctx) => {
    ctx.reply(
        `🏛 <b>Chào mừng đến với Trợ Lý Pháp Lý Tự Động!</b> \n\nTôi có thể cung cấp cho bạn những quy định pháp luật căn bản nhanh chóng. Vui lòng bấm các nút bên dưới hoặc gõ câu hỏi của bạn.`,
        { parse_mode: 'HTML', ...menuKeyboard }
    );
});

bot.hears('📞 Liên hệ Luật sư', (ctx) => {
    ctx.reply('👨‍⚖️ <b>Văn phòng Luật TuanRepo</b>\n📞 Hotline: 09xx.xxx.xxx\n📍 Địa chỉ: TP.HCM\n✉️ Trợ lý sẽ liên hệ lại với bạn trong vòng 2h làm việc!', { parse_mode: 'HTML' });
});

bot.on('text', (ctx) => {
    const text = ctx.message.text;
    if (text === '🚔 Giao thông' || text === '💼 Lao động' || text === '💍 Hôn nhân') {
        const answer = getLegalAdvice(text);
        ctx.reply(answer, { parse_mode: 'HTML' });
    } else {
        // Xử lý chat tự do
        const answer = getLegalAdvice(text);
        ctx.reply(answer, { parse_mode: 'HTML' });
    }
});

// ==========================================
// MÁY CHỦ WEB (CHO RENDER)
// ==========================================
const app = express();
const PORT = process.env.PORT || 3000;
app.get('/', (req, res) => res.send('Legal Advisor Bot is running'));
app.listen(PORT, () => console.log(`Server health-check running on port ${PORT}`));

bot.launch().then(() => {
    console.log('✅ Legal Advisor Bot started!');
    bot.telegram.setMyCommands([
        { command: 'start', description: '🏛 Chạy lại Menu chính' },
        { command: 'help', description: '📖 Trợ giúp hướng dẫn' }
    ]).catch(()=> {});
}).catch(console.error);

process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
