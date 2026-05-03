const { 
    Client, GatewayIntentBits, EmbedBuilder, ActionRowBuilder, 
    ButtonBuilder, ButtonStyle, REST, Routes, 
    TextInputBuilder, TextInputStyle, ModalBuilder, Collection,
    ActivityType, StringSelectMenuBuilder, Partials, Events, PermissionFlagsBits,
    ChannelType 
} = require('discord.js');

const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');

// ==================================
//    🔐 CONFIGURAÇÕES DE ACESSO
// ==================================

// 🔗 LINK DA LOJINHA (COLOQUE O LINK DO RAILWAY AQUI)
const LINK_DA_LOJINHA = "COLOQUE_SEU_LINK_AQUI";

// 🤖 TOKEN DO BOT
const TOKEN = "COLOQUE_SEU_TOKEN_AQUI";

// ==================================
//    🎨 CONFIGURAÇÕES GERAIS
// ==================================
const config = {
    nome: "SEU NOME AQUI",      // 🤖 Nome do bot
    cor: "#CODIGO_DA_COR",      // 🎨 Cor das embeds
    logo: "URL_DA_LOGO_AQUI",   // 🖼️ Link da imagem
    categoria_id: "ID_AQUI",    // 📁 ID da categoria
    taxa: 0.50                  // 💰 Taxa ADM (mude como quiser)
};

// ==================================
//    🎖️  CONFIGURAÇÃO DOS CARGOS
// ==================================
// COLOQUE OS IDS DOS CARGOS QUE O CLIENTE QUER
const cargos_rank = {
    5: "ID_AQUI",    // Cargo para 5 vitórias
    10: "ID_AQUI",   // Cargo para 10 vitórias
    20: "ID_AQUI",   // Cargo para 20 vitórias
    50: "ID_AQUI",   // Cargo para 50 vitórias
    100: "ID_AQUI"   // Cargo para 100 vitórias
};

// ==================================
//    🔓 DADOS DE ATIVAÇÃO
// ==================================
let dados = {
    ativado: false,
    dono: "",
    expiracao: ""
};

if(fs.existsSync('./dados.json')){
    dados = JSON.parse(fs.readFileSync('./dados.json'));
}

function salvarDados(){
    fs.writeFileSync('./dados.json', JSON.stringify(dados, null, 2));
}

// ==================================
//    ⚙️ CONFIGURAÇÕES DO SISTEMA
// ==================================
const cfg = {
    token: TOKEN,
    client_id: process.env.CLIENT_ID, 
    dono_id: process.env.DONO_ID,
    ranks: cargos_rank // Ligando os cargos no sistema
};

// ==================================
//    📂 BANCO DE DADOS
// ==================================
if (!fs.existsSync('./database')) fs.mkdirSync('./database');
const db = new sqlite3.Database('./database/joryel_pro.db');

db.serialize(() => {
    db.run(`CREATE TABLE IF NOT EXISTS usuarios (
        id TEXT PRIMARY KEY, 
        wins INTEGER DEFAULT 0, 
        loses INTEGER DEFAULT 0, 
        streak INTEGER DEFAULT 0
    )`);
    
    db.run(`CREATE TABLE IF NOT EXISTS staff (id TEXT PRIMARY KEY, nome TEXT, pix TEXT, rodizio INTEGER DEFAULT 0)`);
    db.run(`CREATE TABLE IF NOT EXISTS config (key TEXT PRIMARY KEY, val INTEGER)`);
    db.run(`INSERT OR IGNORE INTO config (key, val) VALUES ('resgate', 1)`);
});

// ==================================
//    🤖 INSTÂNCIA DO BOT
// ==================================
const bot = new Client({
    intents: [
        GatewayIntentBits.Guilds, 
        GatewayIntentBits.GuildMessages, 
        GatewayIntentBits.MessageContent, 
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.DirectMessages
    ],
    partials: [
        Partials.Channel, 
        Partials.Message, 
        Partials.User
    ]
});

bot.setMaxListeners(100);
const filas = new Map(); 
const partidas = new Map();

// ==================================
//    🔐 SISTEMA DE ATIVAÇÃO
// ==================================
bot.on('messageCreate', async message => {
    if(message.author.bot) return;

    if(message.content.startsWith('!ativar')){
        const key = message.content.split(' ')[1];

        if(!key){
            return message.reply("❌ **ERRO:** Digite uma Key! \n`!ativar [SUA_KEY]`");
        }

        try {
            const resp = await fetch(`${LINK_DA_LOJINHA}/verificar?key=${key}`);
            const res = await resp.json();

            if(!res.valido){
                return message.reply(`❌ **CHAVE INVÁLIDA!**\n${res.motivo}`);
            }

            dados.ativado = true;
            dados.dono = message.author.id;
            dados.expiracao = res.expiracao;
            salvarDados();

            await fetch(`${LINK_DA_LOJINHA}/usar?key=${key}&user=${message.author.id}`);

            // --- TELA DE SUCESSO ---
            const embed = new EmbedBuilder()
            .setTitle("✅ SISTEMA ATIVADO COM SUCESSO!")
            .setColor(config.cor)
            .setDescription(`
╔══════════════════════════════════════════════════════╗
║ ✅ SISTEMA ATIVADO COM SUCESSO!                     ║
╚══════════════════════════════════════════════════════╝

┌──────────────────────────────────────────────────────┐
│                                                     
│ 🤖 NOME: ${config.nome}
│ 🎨 COR: ${config.cor}
│ 🖼️  LOGO: Carregado...
│                                                     
│ 📁 CATEGORIA: ${config.categoria_id}
│    Onde criam as salas privadas!
│                                                     
│ 💰 TAXA DE ADM: R$ ${config.taxa.toFixed(2)}
│                                                     
│ 🎖️  CARGOS DO RANK:
│    5 vitórias  → ${cargos_rank[5] ? '✅ Configurado' : '⚠️ A definir'}
│    10 vitórias → ${cargos_rank[10] ? '✅ Configurado' : '⚠️ A definir'}
│    20 vitórias → ${cargos_rank[20] ? '✅ Configurado' : '⚠️ A definir'}
│    50 vitórias → ${cargos_rank[50] ? '✅ Configurado' : '⚠️ A definir'}
│    100 vitórias→ ${cargos_rank[100] ? '✅ Configurado' : '⚠️ A definir'}
│                                                     
│ ⏳ VALIDADE: ${res.expiracao}
│                                                     
│ 📢 TODAS AS FUNÇÕES FORAM LIBERADAS!
│    - Ranking, Perfil, Streak
│    - Filas, Gelo Infinito, Sala Privada
│    - Sistema de Staff e Pagamentos
│                                                     
└──────────────────────────────────────────────────────┘

📋 COMANDOS DISPONÍVEIS:

👤 /perfil        → Ver suas estatísticas completas!
🏆 /ranking       → Ver o top dos melhores jogadores!
🎁 /resgatar      → Pegar cargos especiais com mérito!
➕ /criar_fila    → Abrir uma nova arena!
🛡️ /painel_staff → Painel do rodízio de ADMs!

🚀 BOT ONLINE E PRONTO PARA USO!
            `)
            .setThumbnail(config.logo);

            message.reply({ embeds: [embed] });

        } catch (err) {
            message.reply("❌ **ERRO:** Não consegui conectar na Lojinha!");
        }
    }
});

// ==================================
//    🔒 TRAVA DE SEGURANÇA
// ==================================
bot.on(Events.InteractionCreate, async i => {
    if (!dados.ativado && i.user.id !== cfg.dono_id) {
        return i.reply({ 
            content: "🔒 **SISTEMA BLOQUEADO!**\nUse `!ativar [SUA_KEY]` para liberar.", 
            ephemeral: true 
        });
}

// ==================================
//    🚀 EVENTO DE PRONTO
// ==================================
bot.once('ready', () => {
    console.log("=========================================");
    console.log(`🚀 BOT ONLINE: ${config.nome}`);
    console.log(`📊 STATUS: SISTEMA CARREGADO`);
    console.log(`💰 TAXA DEFINIDA: R$ ${config.taxa.toFixed(2)}`);
    console.log("=========================================");
    
    bot.user.setActivity(config.nome, { type: ActivityType.Competing });
});

// ==================================
//    📋 REGISTRO DE COMANDOS
// ==================================
const commands = [
    { name: 'perfil', description: '👤 Veja suas estatísticas completas!' },
    { name: 'ranking', description: '🏆 Abre o Painel de Líderes!' },
    { name: 'resgatar', description: '🎁 Menu de resgate de cargos!' },
    { name: 'criar_fila', description: '➕ [ADM] Iniciar nova fila!' },
    { name: 'painel_staff', description: '🛡️ [DONO] Painel de rodízio!' }
];

const rest = new REST({ version: '10' }).setToken(cfg.token);
bot.once('ready', async () => {
    try {
        await rest.put(Routes.applicationCommands(cfg.client_id), { body: commands });
        console.log('✅ Comandos Slash registrados!');
    } catch (error) { console.error("❌ Erro:", error); }
});

// ==================================
//    👤 PERFIL E RANKING
// ==================================
bot.on(Events.InteractionCreate, async i => {
    // --- TRAVA DE SEGURANÇA (JÁ CONFIGURADA NA PARTE 1) ---
    if (!dados.ativado && i.user.id !== cfg.dono_id) {
        return i.reply({ 
            content: "🔒 **SISTEMA BLOQUEADO!**\nUse `!ativar [SUA_KEY]` para liberar.", 
            ephemeral: true 
        });
    }

    // --- COMANDO PERFIL ---
    if (i.isChatInputCommand() && i.commandName === 'perfil') {
        db.get(`
            SELECT *, 
            (SELECT COUNT(*) + 1 FROM usuarios u2 WHERE u2.wins > u1.wins) as rank_pos 
            FROM usuarios u1 WHERE id = ?`, [i.user.id], async (err, stats) => {
            
            const s = stats || { wins: 0, loses: 0, streak: 0, rank_pos: 'N/A' };
            const embed = new EmbedBuilder()
                .setTitle("🔴 SEU PERFIL")
                .setColor(config.cor)
                .setThumbnail(config.logo)
                .setDescription(`
                👤 **Jogador:** ${i.user.username}
                
                🏆 **Vitórias:** \`${s.wins}\`
                💀 **Derrotas:** \`${s.loses}\`
                🔥 **Streak:** \`${s.streak}\` seguidas
                🏅 **Rank:** \`${s.rank_pos}º Lugar\`
                `);
            return i.reply({ embeds: [embed], ephemeral: true });
        });
    }

    // --- COMANDO RANKING ---
    if (i.isChatInputCommand() && i.commandName === 'ranking') {
        const embed = new EmbedBuilder()
            .setTitle("🏆 RANKING DE JOGADORES")
            .setColor(config.cor)
            .setThumbnail(config.logo)
            .setDescription("Use os botões para ver o top!");

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('rk_wins_0').setLabel('Top Vitórias').setStyle(ButtonStyle.Primary),
            new ButtonBuilder().setCustomId('rk_loses_0').setLabel('Top Derrotas').setStyle(ButtonStyle.Danger)
        );
        return i.reply({ embeds: [embed], components: [row] });
    }

    // --- BOTÕES DO RANKING ---
    if (i.isButton() && i.customId.startsWith('rk_')) {
        const [, coluna, pagina] = i.customId.split('_');
        const limit = 10;
        const offset = parseInt(pagina) * limit;

        db.all(`SELECT id, wins, loses FROM usuarios ORDER BY ${coluna} DESC LIMIT ${limit} OFFSET ${offset}`, async (err, rows) => {
            const lista = rows.map((r, idx) => {
                const pos = offset + idx + 1;
                return `**${pos}.** <@${r.id}> — ${coluna === 'wins' ? r.wins : r.loses} vitórias`;
            }).join('\n') || "Ninguém no ranking ainda.";

            const embed = new EmbedBuilder()
                .setTitle(`🏆 Top ${coluna === 'wins' ? 'Vitórias' : 'Derrotas'}`)
                .setColor(config.cor)
                .setDescription(lista);

            const botoes = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId(`rk_${coluna}_${pagina-1}`).setLabel('⬅️').setStyle(ButtonStyle.Secondary).setDisabled(pagina == 0),
                new ButtonBuilder().setCustomId(`rk_${coluna}_${pagina+1}`).setLabel('➡️').setStyle(ButtonStyle.Secondary)
            );

            return i.update({ embeds: [embed], components: [botoes] });
        });
    }

    // ==================================
    //    🎁 SISTEMA DE RESGATE
    // ==================================
    if (i.isChatInputCommand() && i.commandName === 'resgatar') {
        const embed = new EmbedBuilder()
            .setTitle("🎁 LOJINHA DE CARGOS")
            .setColor(config.cor)
            .setThumbnail(config.logo)
            .setDescription(`
            Resgate cargos especiais conforme suas vitórias!
            
            🎖️ **CARGOS DISPONÍVEIS:**
            ✨ 5 vitórias  → <@&${cargos_rank[5]}>
            🔥 10 vitórias → <@&${cargos_rank[10]}>
            ⚡ 20 vitórias → <@&${cargos_rank[20]}>
            💎 50 vitórias  → <@&${cargos_rank[50]}>
            👑 100 vitórias → <@&${cargos_rank[100]}>
            `);

        const menu = new ActionRowBuilder().addComponents(
            new StringSelectMenuBuilder()
                .setCustomId('menu_resgate')
                .setPlaceholder('🏅 Escolha o cargo para resgatar')
                .addOptions([
                    { label: '✨ 5 Vitórias', value: '5' },
                    { label: '🔥 10 Vitórias', value: '10' },
                    { label: '⚡ 20 Vitórias', value: '20' },
                    { label: '💎 50 Vitórias', value: '50' },
                    { label: '👑 100 Vitórias', value: '100' }
                ])
        );

        return i.reply({ embeds: [embed], components: [menu], ephemeral: true });
    }

    // --- LÓGICA DO MENU DE RESGATE ---
    if (i.isStringSelectMenu() && i.customId === 'menu_resgate') {
        const qtd = parseInt(i.values[0]);
        const cargoId = cargos_rank[qtd];

        db.get("SELECT streak FROM usuarios WHERE id = ?", [i.user.id], async (err, row) => {
            const streak = row?.streak || 0;

            if (streak >= qtd) {
                const cargo = i.guild.roles.cache.get(cargoId);
                const membro = await i.guild.members.fetch(i.user.id);

                if (!cargo) return i.reply({ content: "❌ Cargo não configurado!", ephemeral: true });
                if (membro.roles.cache.has(cargoId)) return i.reply({ content: "✅ Você já tem este cargo!", ephemeral: true });

                await membro.roles.add(cargo);
                return i.reply({ content: `✅ **PARABÉNS!** Você recebeu o cargo ${cargo}!`, ephemeral: false });
            } else {
                return i.reply({ content: `❌ Você precisa de ${qtd} vitórias seguidas! Atualmente tem ${streak}.`, ephemeral: true });
            }
        });
    }

    // ==================================
    //    ➕ SISTEMA DE CRIAR FILA
    // ==================================
    if (i.isChatInputCommand() && i.commandName === 'criar_fila') {
        if(!i.member.permissions.has(PermissionFlagsBits.Administrator)) return i.reply({ content: "❌ Apenas ADM!", ephemeral: true });

        const modal = new ModalBuilder().setCustomId('modal_fila').setTitle('CRIAR ARENA');
        const valorInput = new TextInputBuilder().setCustomId('valor').setLabel("Valor da Aposta").setStyle(TextInputStyle.Short).setRequired(true);
        const modoInput = new TextInputBuilder().setCustomId('modo').setLabel("Modo da Fila").setStyle(TextInputStyle.Short).setRequired(true);
        
        modal.addComponents(new ActionRowBuilder().addComponents(valorInput), new ActionRowBuilder().addComponents(modoInput));
        await i.showModal(modal);
    }

    // --- RECEBER DADOS DO MODAL ---
    if (i.isModalSubmit() && i.customId === 'modal_fila') {
        const valor = i.fields.getTextInputValue('valor');
        const modo = i.fields.getTextInputValue('modo');

        i.guild.channels.create({
            name: `⚔️ ${modo} | R$${valor}`,
            type: ChannelType.GuildText,
            parent: config.categoria_id,
        }).then(async canal => {
            const embed = new EmbedBuilder()
                .setTitle(`🔴 ARENA - ${modo}`)
                .setColor(config.cor)
                .setThumbnail(config.logo)
                .setDescription(`
                💵 **VALOR:** R$ ${valor}
                💰 **TAXA ADM:** R$ ${config.taxa.toFixed(2)}
                👥 **JOGADORES:** 0/2

                CLIQUE PARA ENTRAR!
                `);

            const btn = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('entrar_fila').setLabel('📥 ENTRAR').setStyle(ButtonStyle.Success)
            );

            const msg = await canal.send({ embeds: [embed], components: [btn] });

            partidas.set(canal.id, {
                canal: canal.id,
                msg: msg.id,
                valor: valor,
                modo: modo,
                jogadores: []
            });

            await i.reply({ content: `✅ Arena criada!`, ephemeral: true });
        });
    }

    // --- ENTRAR NA FILA ---
    if (i.isButton() && i.customId === 'entrar_fila') {
        const partida = partidas.get(i.channel.id);
        if(!partida) return;

        if(partida.jogadores.find(p => p.id === i.user.id)) return i.reply({ content: "❌ Já está na fila!", ephemeral: true });
        if(partida.jogadores.length >= 2) return i.reply({ content: "❌ Cheia!", ephemeral: true });

        partida.jogadores.push({ id: i.user.id, nome: i.user.username });

        if(partida.jogadores.length === 1){
            const novoEmbed = new EmbedBuilder()
                .setTitle(`🔴 ARENA - ${partida.modo}`)
                .setColor(config.cor)
                .setDescription(`
                💵 **VALOR:** R$ ${partida.valor}
                💰 **TAXA:** R$ ${config.taxa.toFixed(2)}
                👥 **JOGADORES:** 1/2
                👤 **1:** ${i.user}
                `);
            i.message.edit({ embeds: [novoEmbed] });
            return i.reply({ content: "✅ Entrou! Aguardando...", ephemeral: true });
        }

        // SORTEIO
        if(partida.jogadores.length === 2){
            const [p1, p2] = partida.jogadores.sort(() => Math.random() - 0.5);

            const finalEmbed = new EmbedBuilder()
                .setTitle(`⚔️ PARTIDA PRONTA - ${partida.modo}`)
                .setColor(config.cor)
                .setDescription(`
                💵 **VALOR TOTAL:** R$ ${(parseFloat(partida.valor)*2).toFixed(2)}
                💸 **TAXA ADM:** R$ ${config.taxa.toFixed(2)}

                🔵 **TIME A:** <@${p1.id}>
                🔴 **TIME B:** <@${p2.id}>

                **BOM JOGO!**
                `);

            const botoesFim = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('comecar').setLabel('✅ COMEÇAR').setStyle(ButtonStyle.Success),
                new ButtonBuilder().setCustomId('cancelar').setLabel('❌ CANCELAR').setStyle(ButtonStyle.Danger)
            );

            i.message.edit({ embeds: [finalEmbed], components: [botoesFim] });
            return i.reply({ content: "✅ Times sorteados!", ephemeral: true });
        }
    }

    // --- BOTÕES FINAIS ---
    if (i.isButton() && i.customId === 'comecar') {
        return i.reply({ content: "🚀 Partida iniciada!", ephemeral: true });
    }
    if (i.isButton() && i.customId === 'cancelar') {
        partidas.delete(i.channel.id);
        i.channel.delete();
    }

    // ==================================
    //    🛡️ PAINEL STAFF
    // ==================================
    if (i.isChatInputCommand() && i.commandName === 'painel_staff') {
        if(i.user.id !== cfg.dono_id) return i.reply({ content: "❌ Apenas dono!", ephemeral: true });
        
        const embed = new EmbedBuilder()
            .setTitle("🛡️ RODÍZIO STAFF")
            .setColor(config.cor)
            .setThumbnail(config.logo)
            .setDescription("Gerencie quem está online!");

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('staff_entrar').setLabel('Entrar').setStyle(ButtonStyle.Success),
            new ButtonBuilder().setCustomId('staff_sair').setLabel('Sair').setStyle(ButtonStyle.Danger)
        );

        return i.reply({ embeds: [embed], components: [row] });
    }
});

// ==================================
//    🔌 LOGIN
// ==================================
bot.login(cfg.token);

// ==================================
//    🛡️ SISTEMA STAFF E RODÍZIO
// ==================================

// --- FUNÇÃO AUXILIAR PARA ATUALIZAR O PAINEL ---
async function atualizarPainelStaff(interaction) {
    db.all("SELECT nome FROM staff WHERE rodizio = 1", async (err, rows) => {
        const listaNomes = rows.map(adm => `🟢 **${adm.nome}**`).join('\n') || "*Nenhum ADM online*";
        
        const embed = new EmbedBuilder()
            .setTitle("🛡️ CENTRAL DE RODÍZIO | STAFF")
            .setColor(config.cor)
            .setThumbnail(config.logo)
            .setDescription(
                "Gerencie sua disponibilidade para gerenciar arenas!\n\n" +
                "👥 **ADMs EM RODÍZIO ATIVO:**\n" + listaNomes + "\n\n" +
                "> **✅ ENTRAR:** Fica ativo no sistema.\n" +
                "> **💤 SAIR:** Pausa sua disponibilidade.\n" +
                "> **⚙️ RESET:** Apaga seus dados para cadastrar novo PIX."
            )
            .setFooter({ text: `${config.nome} • Gestão de Equipe` });

        const botoes = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('st_entrar').setLabel('ENTRAR').setStyle(ButtonStyle.Success).setEmoji('✅'),
            new ButtonBuilder().setCustomId('st_sair').setLabel('SAIR').setStyle(ButtonStyle.Danger).setEmoji('💤'),
            new ButtonBuilder().setCustomId('st_reset').setLabel('RESETAR PIX').setStyle(ButtonStyle.Secondary).setEmoji('⚙️')
        );

        if (interaction.isButton() || interaction.isModalSubmit()) {
            await interaction.message.edit({ embeds: [embed], components: [botoes] });
        } else {
            await interaction.channel.send({ embeds: [embed], components: [botoes] });
        }
    });
}

// --- LÓGICA DO PAINEL STAFF ---
bot.on(Events.InteractionCreate, async i => {
    if (!dados.ativado && i.user.id !== cfg.dono_id) return; // TRAVA

    if (i.isChatInputCommand() && i.commandName === 'painel_staff') {
        if (i.user.id !== cfg.dono_id) return i.reply({ content: "❌ Acesso Negado.", ephemeral: true });
        await i.reply({ content: "🚀 Gerando central...", ephemeral: true });
        await atualizarPainelStaff(i);
    }

    if (i.isButton()) {
        const uid = i.user.id;

        if (i.customId === 'st_entrar') {
            db.get("SELECT * FROM staff WHERE id = ?", [uid], async (err, row) => {
                if (!row) {
                    const modal = new ModalBuilder().setCustomId('modal_staff_reg').setTitle('📝 REGISTRO DE RECEBIMENTO');
                    const nIn = new TextInputBuilder().setCustomId('reg_nome').setLabel("NOME COMPLETO").setStyle(TextInputStyle.Short).setRequired(true);
                    const pIn = new TextInputBuilder().setCustomId('reg_pix').setLabel("SUA CHAVE PIX").setStyle(TextInputStyle.Short).setRequired(true);
                    modal.addComponents(new ActionRowBuilder().addComponents(nIn), new ActionRowBuilder().addComponents(pIn));
                    return await i.showModal(modal);
                }
                db.run("UPDATE staff SET rodizio = 1 WHERE id = ?", [uid], async () => {
                    await i.reply({ content: "✅ Você entrou no rodízio!", ephemeral: true });
                    await atualizarPainelStaff(i);
                });
            });
        }

        if (i.customId === 'st_sair') {
            db.run("UPDATE staff SET rodizio = 0 WHERE id = ?", [uid], async () => {
                await i.reply({ content: "💤 Você saiu do rodízio.", ephemeral: true });
                await atualizarPainelStaff(i);
            });
        }

        if (i.customId === 'st_reset') {
            db.run("DELETE FROM staff WHERE id = ?", [uid], async () => {
                await i.reply({ content: "🗑️ Dados limpos! Clique em ENTRAR para recadastrar.", ephemeral: true });
                await atualizarPainelStaff(i);
            });
        }
    }

    if (i.isModalSubmit() && i.customId === 'modal_staff_reg') {
        const nome = i.fields.getTextInputValue('reg_nome').toUpperCase();
        const pix = i.fields.getTextInputValue('reg_pix');

        db.run("INSERT INTO staff (id, nome, pix, rodizio) VALUES (?, ?, ?, 1)", [i.user.id, nome, pix], async (err) => {
            if (err) return i.reply({ content: "❌ Erro ao salvar.", ephemeral: true });
            await i.reply({ content: `✨ **BEM-VINDO!**\nNome: \`${nome}\` registrado.`, ephemeral: true });
            await atualizarPainelStaff(i);
        });
    }
});

// ==================================
//    ⚔️ SISTEMA DE FILAS E SLOTS
// ==================================

// --- FUNÇÃO GERADOR DE BOTÕES ---
function gerarBotoesArena(modo, tipo, valor) {
    const row = new ActionRowBuilder();
    const valReal = parseFloat(valor.toString().replace(',', '.'));
    const vCentavos = Math.round(valReal * 100);
    const idBase = `${modo.replace(/\s+/g, '')}_${tipo.toLowerCase()}_${vCentavos}`;

    if (tipo.toLowerCase() === 'misto') {
        row.addComponents(
            new ButtonBuilder().setCustomId(`ent_${idBase}_1emu`).setLabel('1 Emu').setStyle(ButtonStyle.Secondary).setEmoji('🖱️'),
            new ButtonBuilder().setCustomId(`ent_${idBase}_2emu`).setLabel('2 Emu').setStyle(ButtonStyle.Secondary).setEmoji('🖱️'),
            new ButtonBuilder().setCustomId(`ent_${idBase}_3emu`).setLabel('3 Emu').setStyle(ButtonStyle.Secondary).setEmoji('🖱️')
        );
    } else {
        const rule = modo.includes('1v1') 
            ? {r1:'Gelo Infinito', r2:'Gelo Normal', e1:'❄️', e2:'🧊'} 
            : {r1:'Full UMP/XM8', r2:'Somente Desert', e1:'🔫', e2:'🎯'};
        
        row.addComponents(
            new ButtonBuilder().setCustomId(`ent_${idBase}_r1`).setLabel(rule.r1).setStyle(ButtonStyle.Secondary).setEmoji(rule.e1),
            new ButtonBuilder().setCustomId(`ent_${idBase}_r2`).setLabel(rule.r2).setStyle(ButtonStyle.Secondary).setEmoji(rule.e2)
        );
    }
    row.addComponents(new ButtonBuilder().setCustomId(`sair_${idBase}`).setLabel('Sair').setStyle(ButtonStyle.Danger).setEmoji('❌'));
    return row;
}

// --- LÓGICA DAS ARENAS ---
bot.on(Events.InteractionCreate, async i => {
    if (!dados.ativado && i.user.id !== cfg.dono_id) return; // TRAVA

    // COMANDO CRIAR FILA
    if (i.isChatInputCommand() && i.commandName === 'criar_fila') {
        const modal = new ModalBuilder().setCustomId('mod_mega_form').setTitle(`🚀 ${config.nome}`);
        modal.addComponents(
            new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('f_tit').setLabel("TÍTULO").setValue(config.nome).setStyle(TextInputStyle.Short)),
            new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('f_tipo').setLabel("TIPO").setPlaceholder("Misto").setStyle(TextInputStyle.Short).setRequired(true)),
            new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('f_jog').setLabel("MODO").setPlaceholder("4v4").setStyle(TextInputStyle.Short).setRequired(true)),
            new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('f_prec').setLabel("VALOR ENTRADA").setPlaceholder("10.00").setStyle(TextInputStyle.Paragraph).setRequired(true))
        );
        return await i.showModal(modal);
    }

    // RECEBER DADOS DO MODAL
    if (i.isModalSubmit() && i.customId === 'mod_mega_form') {
        const inputPlat = i.fields.getTextInputValue('f_tipo').toUpperCase();
        const inputModo = i.fields.getTextInputValue('f_jog');
        const precos = i.fields.getTextInputValue('f_prec').split(',').map(v => v.trim());
        await i.reply({ content: `✨ Gerando arenas...`, ephemeral: true });

        for (const preco of precos) {
            const embed = new EmbedBuilder()
                .setTitle(`🦅 ${config.nome}`)
                .setColor(config.cor)
                .setThumbnail(config.logo)
                .setDescription(`🎮 **MODO:**\n${inputModo} ${inputPlat}\n\n💰 **VALOR:**\nR$ ${preco}\n\n👤 **JOGADORES:**\nNenhum 👤 jogador se encontra no ⏳ momento.`);

            await i.channel.send({ embeds: [embed], components: [gerarBotoesArena(inputModo, inputPlat, preco)] });
        }
    }

    // --- SISTEMA DE ENTRAR ---
    if (i.isButton() && i.customId.startsWith('ent_')) {
        const chaveFila = i.customId; 
        const [, modo, tipo, vCentavos] = i.customId.split('_');
        const idArena = `${modo}_${tipo}_${vCentavos}`;

        // TRAVA DE DUPLICIDADE
        let jaEsta = false;
        filas.forEach((lista, chave) => {
            if (chave.includes(idArena) && lista.includes(i.user.id)) jaEsta = true;
        });
        if (jaEsta) return i.reply({ content: "⚠️ Você já está nesta arena! Saia primeiro.", ephemeral: true });

        if (!filas.has(chaveFila)) filas.set(chaveFila, []);
        const lista = filas.get(chaveFila);
        lista.push(i.user.id);

        if (lista.length >= 2) {
            const p1 = lista.shift(); const p2 = lista.shift();
            const baseDesc = i.message.embeds[0].description.split('👤 **JOGADORES:**')[0];
            await i.update({ embeds: [EmbedBuilder.from(i.message.embeds[0]).setDescription(`${baseDesc}👤 **JOGADORES:**\nNenhum 👤 jogador se encontra no ⏳ momento.`)] });
            
            const valReal = parseInt(vCentavos) / 100;
            await iniciarArenaPrivada(i.guild, p1, p2, modo, tipo, valReal, i.component.label);
        } else {
            const baseDesc = i.message.embeds[0].description.split('👤 **JOGADORES:**')[0];
            let txt = "";
            filas.forEach((jogadores, idFila) => {
                if (idFila.includes(idArena) && jogadores.length > 0) {
                    const btn = i.message.components.flatMap(c => c.components).find(b => b.customId === idFila);
                    jogadores.forEach(id => { txt += `🔹 **${btn?.label || 'Slot'}:** <@${id}>\n`; });
                }
            });
            await i.update({ embeds: [EmbedBuilder.from(i.message.embeds[0]).setDescription(`${baseDesc}👤 **JOGADORES:**\n${txt}`)] });
        }
    }

    // --- SISTEMA DE SAIR ---
    if (i.isButton() && i.customId.startsWith('sair_')) {
        const idBusca = i.customId.replace('sair_', '');
        let removido = false;

        filas.forEach((lista, chave) => {
            if (chave.includes(idBusca)) {
                const idx = lista.indexOf(i.user.id);
                if (idx > -1) {
                    lista.splice(idx, 1);
                    removido = true;
                }
            }
        });

        if (!removido) return i.reply({ content: "⚠️ Você não está na fila!", ephemeral: true });

        const baseDesc = i.message.embeds[0].description.split('👤 **JOGADORES:**')[0];
        let txt = "";
        filas.forEach((jogadores, idFila) => {
             if (idFila.includes(idBusca) && jogadores.length > 0) {
                const btn = i.message.components.flatMap(c => c.components).find(b => b.customId === idFila);
                jogadores.forEach(id => { txt += `🔹 **${btn?.label || 'Slot'}:** <@${id}>\n`; });
            }
        });
        await i.update({ embeds: [EmbedBuilder.from(i.message.embeds[0]).setDescription(`${baseDesc}👤 **JOGADORES:**\n${txt || "Nenhum jogador no momento."}`)] });
    }
});

// ==================================
//    🔌 LOGIN FINAL
// ==================================
bot.login(cfg.token);

// --- 6.1 FUNÇÃO QUE GERA A ARENA PRIVADA ---
async function iniciarArenaPrivada(guild, p1, p2, modo, tipo, valorEntrada, regraEscolhida) {
    const categoriaID = config.categoria_id; // Usando a configuração

    // 1. SORTEIA UM ADM DISPONÍVEL NO RODÍZIO
    db.get("SELECT * FROM staff WHERE rodizio = 1 ORDER BY RANDOM() LIMIT 1", async (err, adm) => {
        if (err || !adm) {
            console.log("❌ Erro: Nenhum ADM no rodízio ou erro no DB.", err);
            return;
        }

        try {
            // 2. CRIA O CANAL PRIVADO
            const canal = await guild.channels.create({
                name: `⏳-aguardando-${valorEntrada.toFixed(0)}`,
                type: ChannelType.GuildText,
                parent: categoriaID,
                permissionOverwrites: [
                    { id: guild.roles.everyone, deny: [PermissionFlagsBits.ViewChannel] },
                    { id: p1, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory] },
                    { id: p2, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory] },
                    { id: adm.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ManageChannels, PermissionFlagsBits.ReadMessageHistory] },
                    { id: bot.user.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ManageChannels, PermissionFlagsBits.EmbedLinks] }
                ]
            });

            partidas.set(canal.id, { 
                p1, p2, adm: adm, valor: valorEntrada, modo, tipo, c1: false, c2: false, regra: regraEscolhida 
            });

            // 3. LAYOUT DO PAINEL
            const embedConf = new EmbedBuilder()
                .setTitle(`🦅 ARENA FORMADA! | ${config.nome}`)
                .setColor(config.cor)
                .setDescription(
                    `👥 **Jogadores:** <@${p1}> vs <@${p2}>\n` +
                    `🎮 **Modo:** \`${modo} ${tipo}\`\n` +
                    `💰 **Entrada:** \`R$ ${valorEntrada.toFixed(2)}\`\n\n` +
                    `> Ambos devem clicar em **CONFIRMAR** para o ADM <@${adm.id}> liberar o PIX.`
                )
                .setThumbnail(config.logo)
                .setFooter({ text: `${config.nome} • Respeite as regras!` });

            const btns = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('p_confirmar').setLabel('CONFIRMAR').setStyle(ButtonStyle.Success).setEmoji('✅'),
                new ButtonBuilder().setCustomId('p_cancelar').setLabel('CANCELAR').setStyle(ButtonStyle.Danger).setEmoji('❌')
            );

            await canal.send({ content: `🔔 <@${p1}> <@${p2}> | Arena pronta!`, embeds: [embedConf], components: [btns] });

        } catch (error) {
            console.error("❌ Erro ao criar canal:", error);
        }
    });
}

// --- 7.1 FUNÇÃO DO PAINEL DE VITÓRIA ---
async function enviarPainelVitoria(channel, p) {
    const embedVitoria = new EmbedBuilder()
        .setTitle("🏁 GESTÃO DE RESULTADO")
        .setDescription(`ADM <@${p.adm.id}>, use os botões abaixo para finalizar a arena.`)
        .setColor(config.cor);

    const row1 = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('vit_comum').setLabel('VITÓRIA').setStyle(ButtonStyle.Success).setEmoji('🏆'),
        new ButtonBuilder().setCustomId('vit_wo').setLabel('VITÓRIA W.O').setStyle(ButtonStyle.Primary).setEmoji('🏳️')
    );

    const row2 = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('vit_rv').setLabel('REVANCHE').setStyle(ButtonStyle.Secondary).setEmoji('🔄'),
        new ButtonBuilder().setCustomId('p_cancelar_gestao').setLabel('CANCELAR').setStyle(ButtonStyle.Danger).setEmoji('❌')
    );

    await channel.send({ content: `📢 **Atenção ADM:** <@${p.adm.id}>`, embeds: [embedVitoria], components: [row1, row2] });
}

// --- 7.2 LÓGICA COMPLETA DA ARENA ---
bot.on(Events.InteractionCreate, async i => {
    const p = partidas.get(i.channel.id);
    if (!p) return;

    // TRAVA DE SEGURANÇA GERAL
    if (!dados.ativado && i.user.id !== cfg.dono_id) return;

    // 1. BOTÃO DE COPIAR ID
    if (i.isButton() && i.customId.startsWith('copy_')) {
        const idParaCopiar = i.customId.split('_')[1];
        return i.reply({ content: `${idParaCopiar}`, ephemeral: true });
    }

    // 2. CONFIRMAÇÃO INICIAL
    if (i.customId === 'p_confirmar') {
        if (i.user.id !== p.p1 && i.user.id !== p.p2) 
            return i.reply({ content: "❌ Você não faz parte desta arena.", ephemeral: true });
        
        if (i.user.id === p.p1) p.c1 = true;
        if (i.user.id === p.p2) p.c2 = true;
        await i.reply({ content: `✅ <@${i.user.id}> confirmou participação!`, ephemeral: false });

        if (p.c1 && p.c2) {
            await i.message.delete().catch(() => {});
            const embedG = new EmbedBuilder()
                .setTitle("🛠️ GESTÃO DO ADM")
                .setDescription("Ambos confirmaram! Escolha uma opção abaixo.")
                .setColor(config.cor);
            const btnG = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('adm_show_pix').setLabel('LIBERAR PIX').setStyle(ButtonStyle.Primary).setEmoji('💸'),
                new ButtonBuilder().setCustomId('adm_abrir_sala').setLabel('POSTAR DADOS').setStyle(ButtonStyle.Secondary).setEmoji('📍')
            );
            await i.channel.send({ content: `<@${p.adm.id}>`, embeds: [embedG], components: [btnG] });
        }
        return;
    }

    // 🛡️ TRAVA: SOMENTE ADM OU DONO
    const botoesADM = ['adm_show_pix', 'adm_abrir_sala', 'vit_comum', 'vit_wo', 'vit_rv', 'setwin_', 'p_cancelar_gestao'];
    if (botoesADM.some(id => i.customId.startsWith(id))) {
        if (i.user.id !== p.adm.id && i.user.id !== cfg.dono_id) {
            return i.reply({ content: `🚫 **ACESSO NEGADO:** Somente o ADM <@${p.adm.id}> pode realizar esta ação.`, ephemeral: true });
        }
    }

    // --- COMANDOS DO ADM ---

    // LIBERAR PIX
    if (i.customId === 'adm_show_pix') {
        await i.channel.setName(`💸-pagamento-${p.valor.toFixed(0)}`).catch(() => {});
        const valorTotal = p.valor + config.taxa; // Usa a taxa configurada
        const embedP = new EmbedBuilder()
            .setTitle("💰 DADOS PARA PAGAMENTO")
            .setDescription(`💵 **Valor:** \`R$ ${valorTotal.toFixed(2)}\` (cada)\n👤 **Nome:** \`${p.adm.nome}\`\n🔑 **PIX:** \`${p.adm.pix}\``)
            .setColor("#FEE75C");
        return i.reply({ embeds: [embedP] });
    }

    // ABRIR SALA
    if (i.customId === 'adm_abrir_sala') {
        const modal = new ModalBuilder().setCustomId('mod_sala_dados').setTitle('🎮 DADOS DA SALA');
        modal.addComponents(
            new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('id_s').setLabel("ID DA SALA").setStyle(TextInputStyle.Short).setRequired(true)),
            new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('pw_s').setLabel("SENHA").setStyle(TextInputStyle.Short).setRequired(true))
        );
        return await i.showModal(modal);
    }

    if (i.isModalSubmit() && i.customId === 'mod_sala_dados') {
        const idS = i.fields.getTextInputValue('id_s');
        const pwS = i.fields.getTextInputValue('pw_s');
        await i.channel.setName(`⚔️-em-andamento-${p.valor.toFixed(0)}`).catch(() => {});
        const embedSala = new EmbedBuilder()
            .setColor(config.cor)
            .setDescription(`**A sala foi criada!**\n\n↪ **ID:** \`${idS}\`\n↪ **Senha:** \`${pwS}\``);
        const row = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId(`copy_${idS}`).setLabel('Copiar ID').setStyle(ButtonStyle.Secondary));
        await i.reply({ embeds: [embedSala], components: [row] });
        await enviarPainelVitoria(i.channel, p);
        return;
    }

    // ESCOLHER VENCEDOR
    if (i.customId === 'vit_comum' || i.customId === 'vit_wo') {
        const m1 = await i.guild.members.fetch(p.p1).catch(() => ({ displayName: 'Jogador 1' }));
        const m2 = await i.guild.members.fetch(p.p2).catch(() => ({ displayName: 'Jogador 2' }));
        const menuEscolha = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId(`setwin_${p.p1}`).setLabel(`@${m1.displayName}`).setStyle(ButtonStyle.Success),
            new ButtonBuilder().setCustomId(`setwin_${p.p2}`).setLabel(`@${m2.displayName}`).setStyle(ButtonStyle.Danger)
        );
        return i.reply({ content: "❓ **Quem venceu a arena?**", components: [menuEscolha], ephemeral: true });
    }

    // FINALIZAR E SALVAR DADOS
    if (i.customId.startsWith('setwin_')) {
        const vId = i.customId.split('_')[1]; 
        const pId = (vId === p.p1) ? p.p2 : p.p1;

        await i.update({ content: `✅ Vitória gravada! Atualizando Ranking...`, components: [] }).catch(() => {});

        db.serialize(() => {
            db.run(`INSERT OR IGNORE INTO usuarios (id, wins, loses, streak) VALUES (?, 0, 0, 0)`, [vId]);
            db.run(`INSERT OR IGNORE INTO usuarios (id, wins, loses, streak) VALUES (?, 0, 0, 0)`, [pId]);
            db.run(`UPDATE usuarios SET wins = wins + 1, streak = streak + 1 WHERE id = ?`, [vId]);
            db.run(`UPDATE usuarios SET loses = loses + 1, streak = 0 WHERE id = ?`, [pId]);
        });

        await i.channel.send(`🏆 **ARENA FINALIZADA!**\nVencedor: <@${vId}>\n*Os dados foram salvos no seu **/perfil**. Canal deletando em 5s...*`);
        
        partidas.delete(i.channel.id);
        setTimeout(async () => { try { await i.channel.delete(); } catch (e) {} }, 5000); 
    }

    // REVANCHE
    if (i.customId === 'vit_rv') {
        const modalRV = new ModalBuilder().setCustomId('mod_rv').setTitle('🔄 CONFIGURAR REVANCHE');
        modalRV.addComponents(new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('v_rv').setLabel("NOVO VALOR").setStyle(TextInputStyle.Short).setRequired(true)));
        return await i.showModal(modalRV);
    }

    if (i.isModalSubmit() && i.customId === 'mod_rv') {
        const novoV = parseFloat(i.fields.getTextInputValue('v_rv').replace(',', '.'));
        p.valor = novoV; p.c1 = false; p.c2 = false; 
        await i.reply({ content: `🔄 **REVANCHE DEFINIDA!** Valor: R$ ${novoV.toFixed(2)}.\nOs jogadores devem confirmar participação novamente.` });
        try { await i.channel.setName(`⏳-revanche-${novoV.toFixed(0)}`); } catch (e) {}
    }

    // CANCELAR GESTÃO
    if (i.customId === 'p_cancelar_gestao') {
        await i.reply("❌ **ARENA CANCELADA PELO ADM.** Apagando em 5 segundos...");
        partidas.delete(i.channel.id);
        setTimeout(async () => { try { await i.channel.delete(); } catch (e) {} }, 5000);
    }

    // CANCELAR INICIAL
    if (i.customId === 'p_cancelar') {
        if (i.user.id !== p.p1 && i.user.id !== p.p2) return i.reply({ content: "❌ Sem permissão.", ephemeral: true });
        await i.reply("❌ **ARENA CANCELADA.** Deletando...");
        partidas.delete(i.channel.id);
        setTimeout(async () => { try { await i.channel.delete(); } catch (e) {} }, 5000);
    }
});
              
