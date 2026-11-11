const { default: makeWASocket, useMultiFileAuthState, DisconnectReason, fetchLatestBaileysVersion, makeInMemoryStore } = require('@whiskeysockets/baileys');
const pino = require('pino');

const store = makeInMemoryStore({ logger: pino().child({ level: 'silent', stream: 'store' }) });

async function startBot() {
    const { state, saveCreds } = await useMultiFileAuthState('auth_info_baileys');
    const { version, isLatest } = await fetchLatestBaileysVersion();
    
    console.log(`✨ SAKA BOT - نسخة واتساب رقم: ${version.join('.')}`);

    const sock = makeWASocket({
        logger: pino({ level: 'silent' }),
        auth: state,
        browser: ["SAKA BOT Platform", "Chrome", "4.0.0"],
        markOnlineOnConnect: true,
        generateHighQualityLinkPreview: true
    });

    store.bind(sock.ev);
    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('connection.update', (update) => {
        const { connection, lastDisconnect, qr } = update;
        
        if (qr) {
            console.log('📷 تم توليد QR Code لـ SAKA BOT، امسحه للربط.');
        }

        if (connection === 'close') {
            const shouldReconnect = (lastDisconnect?.error)?.output?.statusCode !== DisconnectReason.loggedOut;
            console.log('⚠️ انقطع الاتصال، جاري إعادة تشغيل SAKA BOT فوراً...');
            if (shouldReconnect) {
                startBot();
            }
        } else if (connection === 'open') {
            console.log('🚀 تم تشغيل SAKA BOT والاتصال بقاعدة المنصة بنجاح يا معلم!');
        }
    });

    sock.ev.on('messages.upsert', async ({ messages }) => {
        const m = messages[0];
        if (!m.message || m.key.fromMe) return;

        const sender = m.key.remoteJid;
        const textMessage = m.message.conversation || m.message.extendedTextMessage?.text || '';

        console.log(`📩 رسالة جديدة لـ SAKA BOT من ${sender}: ${textMessage}`);

        if (textMessage.startsWith('ر ') || textMessage.startsWith('بحث ')) {
            const query = textMessage.replace(/^[ر بحث]\s*/, '');

            const captionText = `
🔍 **نتائج البحث الفوري:** ${query}
\n┗━━━━━━━ ❝ **SAKA BOT** ❞ ━━━━━━━┛\n
🎵 **اختر العنصر المطلوب من القائمة أدناه:**
            `.trim();

            await sock.sendMessage(sender, {
                image: { url: 'https://images.unsplash.com/photo-1607604276583-eef5d076aa5f' },
                caption: captionText,
                contextInfo: {
                    forwardingScore: 999,
                    isForwarded: true,
                    forwardedNewsletterMessageInfo: {
                        newsletterJid: 'YOUR_CHANNEL_JID@newsletter',
                        newsletterName: 'SAKA BOT ✦ CHANNEL 🎵',
                        serverMessageId: 100
                    }
                }
            }, { quoted: m });
        }
        
        else if (textMessage === 'السلام عليكم' || textMessage === 'مرحبا') {
            await sock.sendMessage(sender, { 
                text: 'وعليكم السلام يا معلم 🚀 SAKA BOT شغال بأقصى سرعة وجاهز لأوامرك.' 
            }, { quoted: m });
        }
    });
}

startBot();
