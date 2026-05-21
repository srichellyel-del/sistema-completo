const { 
    Client, GatewayIntentBits, EmbedBuilder, ActionRowBuilder, 
    ButtonBuilder, ButtonStyle, REST, Routes, 
    TextInputBuilder, TextInputStyle, ModalBuilder, Collection,
    ActivityType, StringSelectMenuBuilder, Partials, Events, PermissionFlagsBits,
    ChannelType 
} = require('discord.js');

const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');

// --- 1.1 CONFIGURAÇÕES GLOBAIS (VARIÁVEIS DA RAILWAY) ---
const cfg = {
    token: process.env.DISCORD_TOKEN,
    client_id: process.env.CLIENT_ID, 
    dono_id: process.env.DONO_ID,
    categoria_id: process.env.ID_CATEGORIA_DESAFIO,
    taxa: 0.20, // TAXA FIXA DE R$ 0,20 POR JOGADOR
    
    // SISTEMA DE LOJINHA (Lendo seus IDs do Railway)
    ranks: {
        5: process.env.RANK_5, 
        10: process.env.RANK_10, 
        20: process.env.RANK_20,
        50: process.env.RANK_50, 
        100: process.env.RANK_100
    }
};

// --- 1.2 BANCO DE DADOS (SQLite3 COM PERSISTÊNCIA) ---
// Importante: No Railway, a pasta 'database' deve estar em um Volume
if (!fs.existsSync('./database')) fs.mkdirSync('./database');
const db = new sqlite3.Database('./database/joryel_pro.db');

db.serialize(() => {
    // Tabela de Usuários: Crucial para o Ranking, Perfil e Streak saírem do ZERO
    db.run(`CREATE TABLE IF NOT EXISTS usuarios (
        id TEXT PRIMARY KEY, 
        wins INTEGER DEFAULT 0, 
        loses INTEGER DEFAULT 0, 
        streak INTEGER DEFAULT 0
    )`);
    
    // Tabela de Staff: Gerencia o Rodízio e os Dados de PIX
    db.run(`CREATE TABLE IF NOT EXISTS staff (id TEXT PRIMARY KEY, nome TEXT, pix TEXT, rodizio INTEGER DEFAULT 0)`);
    
    // Tabela de Configuração: Trava de manutenção do resgate
    db.run(`CREATE TABLE IF NOT EXISTS config (key TEXT PRIMARY KEY, val INTEGER)`);
    db.run(`INSERT OR IGNORE INTO config (key, val) VALUES ('resgate', 1)`);
});

// --- 1.3 INSTÂNCIA DO BOT E INTENTS ---
const bot = new Client({
    intents: [
        GatewayIntentBits.Guilds, 
        GatewayIntentBits.GuildMessages, 
        GatewayIntentBits.MessageContent, 
        GatewayIntentBits.GuildMembers, // Necessário para ver nomes no Ranking
        GatewayIntentBits.DirectMessages
    ],
    partials: [
        Partials.Channel, 
        Partials.Message, 
        Partials.User
    ]
});

// Suporte para muitas arenas simultâneas
bot.setMaxListeners(100);

// Mapas de Memória (Filas e Partidas Ativas)
const filas = new Map(); 
const partidas = new Map();

bot.once('ready', () => {
    console.log("=========================================");
    console.log(`🚀 ONLINE: JORYEL APOSTAS & ORG`);
    console.log(`📊 STATUS: RANKING E LOJINHA SINCRONIZADOS`);
    console.log(`📂 BANCO DE DADOS: PRONTO PARA GRAVAR VITÓRIAS`);
    console.log("=========================================");
    
    // Status do Bot no Discord
    bot.user.setActivity('JORYEL APOSTAS & ORG', { type: ActivityType.Competing });
});

bot.login(cfg.token);

// --- 2.1 DEFINIÇÃO DOS COMANDOS SLASH ---
const commands = [
    { name: 'perfil', description: '👤 Veja suas estatísticas de vitórias e derrotas' },
    { name: 'ranking', description: '🏆 Abre o Painel Fixo de Líderes' },
    { name: 'resgatar', description: '🎁 Menu de resgate de cargos na lojinha de cargos' },
    { name: 'criar_fila', description: '➕ [ADM] Iniciar nova fila de apostas dinâmica' },
    { name: 'painel_staff', description: '🛡️ [DONO] Gerar painel de rodízio para os ADMs' }
];

// Registro e Sincronização dos Comandos
bot.once('ready', async () => {
    const rest = new REST({ version: '10' }).setToken(cfg.token);
    try {
        await rest.put(Routes.applicationCommands(cfg.client_id), { body: commands });
        console.log('✅ [SISTEMA] Comandos Slash registrados!');
    } catch (error) { console.error("❌ Erro Slash:", error); }
});

// --- 2.2 OUVIDOR CENTRAL DE INTERAÇÕES (MENU FIXO) ---
bot.on(Events.InteractionCreate, async i => {
    // 1. COMANDO /RANKING (Gera o menu que fica parado no canal)
    if (i.isChatInputCommand() && i.commandName === 'ranking') {
        const embed = new EmbedBuilder()
            .setTitle("Seu Perfil e Ranking")
            .setDescription("Veja seu perfil e o ranking do servidor através dos botões abaixo.\n\n*As informações aparecerão apenas para você.*")
            .setColor("#2b2d31");

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('btn_perfil_ver').setLabel('Seu Perfil').setStyle(ButtonStyle.Secondary),
            new ButtonBuilder().setCustomId('rk_wins_0').setLabel('Ranking').setStyle(ButtonStyle.Secondary)
        );
        // Resposta pública para o menu ficar fixo no chat
        return i.reply({ embeds: [embed], components: [row] });
    }

    // 2. COMANDO /PERFIL (Direto via barra)
    if (i.isChatInputCommand() && i.commandName === 'perfil') {
        return enviarPerfilPrivado(i, i.user.id);
    }

    // 3. LOGICA DOS BOTÕES (RESPOSTAS PRIVADAS)
    if (i.isButton()) {
        // Botão "Seu Perfil"
        if (i.customId === 'btn_perfil_ver') {
            return enviarPerfilPrivado(i, i.user.id);
        }
        
        // Botão "Ranking" ou Setas de Navegação
        if (i.customId.startsWith('rk_')) {
            const [, coluna, pagina] = i.customId.split('_');
            return renderRankingPrivado(i, coluna, parseInt(pagina));
        }
    }
});

// --- 2.3 FUNÇÃO DO PERFIL (APARECE SÓ PARA O INDIVÍDUO) ---
async function enviarPerfilPrivado(i, targetId) {
    db.get(`
        SELECT *, 
        (SELECT COUNT(*) + 1 FROM usuarios u2 WHERE u2.wins > u1.wins) as rank_pos 
        FROM usuarios u1 WHERE id = ?`, [targetId], async (err, stats) => {
        
        const s = stats || { wins: 0, loses: 0, streak: 0, rank_pos: 'N/A' };
        const user = await bot.users.fetch(targetId);

        const embed = new EmbedBuilder()
            .setTitle("🔴 SEU PERFIL DE ATLETA")
            .setColor("#f04747")
            .setThumbnail(user.displayAvatarURL({ dynamic: true }))
            .setDescription(
                `👤 **Jogador:** <@${targetId}>\n\n` +
                `🏆 **Vitórias:** \`${s.wins}\`\n` +
                `💀 **Derrotas:** \`${s.loses}\`\n` +
                `🔥 **Streak Atual:** \`${s.streak}\` seguidas\n` +
                `🏅 **Rank Global:** \`${s.rank_pos}º Lugar\``
            )
            .setFooter({ text: "Status: Somente você pode ver esta mensagem." });

        // ephemeral: true faz a mensagem ser privada
        return i.reply({ embeds: [embed], ephemeral: true });
    });
}

// --- 2.4 FUNÇÃO DO RANKING (APARECE SÓ PARA O INDIVÍDUO) ---
async function renderRankingPrivado(i, coluna, pagina = 0) {
    const limit = 10;
    const offset = pagina * limit;
    const isWin = coluna === 'wins';

    db.all(`SELECT id, wins, loses FROM usuarios ORDER BY ${coluna} DESC LIMIT ${limit} OFFSET ${offset}`, async (err, rows) => {
        const embed = new EmbedBuilder()
            .setTitle("🏆 Ranking de Jogadores")
            .setColor("#2b2d31")
            .setDescription(rows.map((r, idx) => {
                const pos = offset + idx + 1;
                return `**${pos}.** <@${r.id}> — Vitórias: \`${r.wins}\``;
            }).join('\n') || "Ninguém no ranking ainda.")
            .setFooter({ text: `Página ${pagina + 1} de 5 • Privado` });

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId(`rk_${coluna}_${pagina - 1}`).setLabel('⬅️').setStyle(ButtonStyle.Primary).setDisabled(pagina === 0),
            new ButtonBuilder().setCustomId(isWin ? `rk_loses_0` : `rk_wins_0`).setLabel(isWin ? 'Ver Derrotas' : 'Ver Vitórias').setStyle(ButtonStyle.Secondary),
            new ButtonBuilder().setCustomId(`rk_${coluna}_${pagina + 1}`).setLabel('➡️').setStyle(ButtonStyle.Primary).setDisabled(pagina === 4 || rows.length < limit)
        );

        // Se o usuário já está vendo o ranking privado, ele apenas EDITA a mensagem dele
        if (i.customId.startsWith('rk_') && i.message.flags.has('Ephemeral')) {
            return i.update({ embeds: [embed], components: [row] });
        }
        
        // Se for o primeiro clique no menu fixo, manda a RESPOSTA PRIVADA
        return i.reply({ embeds: [embed], components: [row], ephemeral: true });
    });
}

// --- 3.1 OUVIDOR DE INTERAÇÕES (PT 3: RESGATE DE CARGOS) ---
bot.on(Events.InteractionCreate, async i => {
    
    // COMANDO /RESGATAR
    if (i.isChatInputCommand() && i.commandName === 'resgatar') {
        db.get("SELECT val FROM config WHERE key = 'resgate'", (err, cfg_db) => {
            // Trava de manutenção (O Dono sempre consegue usar para testar)
            if (!cfg_db?.val && i.user.id !== cfg.dono_id) {
                return i.reply({ content: "🛑 **SISTEMA EM MANUTENÇÃO:** O resgate de cargos está temporariamente desativado.", ephemeral: true });
            }

            const embed = new EmbedBuilder()
                .setTitle("🎁 CENTRAL DE MÉRITO | JORYEL APOSTAS & ORG")
                .setDescription(
                    "Reivindique cargos exclusivos com base na sua performance nas arenas!\n\n" +
                    "> **Como funciona?** O bot analisa seu streak (vitórias seguidas) e libera o cargo se você atingiu a meta."
                )
                .setColor("#1abc9c")
                .setThumbnail(i.guild.iconURL())
                .setFooter({ text: "JORYEL APOSTAS & ORG • Reconhecimento de Elite" });

            const menu = new ActionRowBuilder().addComponents(
                new StringSelectMenuBuilder()
                    .setCustomId('menu_resgate')
                    .setPlaceholder('🏅 Escolha o cargo para resgatar')
                    .addOptions([
                        { label: '✨ Aquecendo', value: '5', description: 'Requisito: 5 vitórias seguidas' },
                        { label: '🔥 Em Chamas', value: '10', description: 'Requisito: 10 vitórias seguidas' },
                        { label: '⚡ Imparável', value: '20', description: 'Requisito: 20 vitórias seguidas' },
                        { label: '😈 Fenômeno', value: '50', description: 'Requisito: 50 vitórias seguidas' },
                        { label: '💎 Deus da Fila', value: '100', description: 'Requisito: 100 vitórias seguidas' }
                    ])
            );

            return i.reply({ embeds: [embed], components: [menu], ephemeral: false });
        });
    }

    // --- 3.2 LÓGICA DE ENTREGA DOS CARGOS (CONECTADO COM PT 1) ---
    if (i.isStringSelectMenu() && i.customId === 'menu_resgate') {
        const streakAlvo = parseInt(i.values[0]);
        const cargoID = cfg.ranks[streakAlvo]; // Pega o ID que você configurou na Parte 1

        db.get("SELECT streak FROM usuarios WHERE id = ?", [i.user.id], async (err, row) => {
            const streakAtual = row?.streak || 0;

            if (streakAtual >= streakAlvo) {
                // Tenta encontrar o cargo no servidor
                const cargo = i.guild.roles.cache.get(cargoID);
                
                if (cargo) {
                    const membro = await i.guild.members.fetch(i.user.id).catch(() => null);
                    if (membro) {
                        // Verifica se o usuário já tem o cargo
                        if (membro.roles.cache.has(cargoID)) {
                            return i.reply({ content: `✅ Você já possui o cargo **${cargo.name}** em seu perfil!`, ephemeral: true });
                        }

                        // Tenta adicionar o cargo ao usuário
                        await membro.roles.add(cargo).catch(e => {
                            console.error("Erro de Permissão:", e);
                            return i.reply({ content: "❌ **ERRO DE PERMISSÃO:** Não consegui te dar o cargo. Verifique se o cargo do Bot está **ACIMA** do cargo de mérito na lista do servidor.", ephemeral: true });
                        });

                        return i.reply({ 
                            content: `✨ **CONQUISTA DESTRAVADA!** <@${i.user.id}> atingiu a marca de \`${streakAlvo}\` vitórias seguidas e agora é um **${cargo.name}**!`, 
                            ephemeral: false 
                        });
                    }
                } else {
                    // Mensagem caso o ID no Railway esteja errado ou faltando
                    return i.reply({ content: `❌ **ERRO DE CONFIGURAÇÃO:** O ID para o Rank ${streakAlvo} não foi encontrado no Railway. Avise o dono!`, ephemeral: true });
                }
            } else {
                return i.reply({ 
                    content: `❌ **MÉRITO INSUFICIENTE:** Sua sequência atual é de \`${streakAtual}\` vitórias. Você precisa de \`${streakAlvo}\` para resgatar este cargo.`, 
                    ephemeral: true 
                });
            }
        });
    }
});

// --- 4.1 FUNÇÃO AUXILIAR PARA ATUALIZAR O VISUAL DO PAINEL ---
async function atualizarPainelStaff(interaction) {
    db.all("SELECT nome FROM staff WHERE rodizio = 1", async (err, rows) => {
        const listaNomes = rows.map(adm => `🟢 **${adm.nome}**`).join('\n') || "*Nenhum ADM online no momento*";
        
        const embed = new EmbedBuilder()
            .setTitle("🛡️ CENTRAL DE RODÍZIO | STAFF JORYEL")
            .setDescription(
                "Gerencie sua disponibilidade para gerenciar arenas e receber pagamentos.\n\n" +
                "👥 **ADMs EM RODÍZIO ATIVO:**\n" + listaNomes + "\n\n" +
                "> **✅ ENTRAR:** Fica ativo no sistema para receber partidas.\n" +
                "> **💤 SAIR:** Pausa sua disponibilidade no rodízio.\n" +
                "> **⚙️ RESET:** Apaga seus dados para cadastrar um novo PIX."
            )
            .setColor("#2b2d31")
            .setThumbnail(interaction.guild.iconURL())
            .setFooter({ text: "JORYEL APOSTAS & ORG • Gestão de Equipe" });

        const botoes = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('st_entrar').setLabel('ENTRAR').setStyle(ButtonStyle.Success).setEmoji('✅'),
            new ButtonBuilder().setCustomId('st_sair').setLabel('SAIR').setStyle(ButtonStyle.Danger).setEmoji('💤'),
            new ButtonBuilder().setCustomId('st_reset').setLabel('RESETAR PIX').setStyle(ButtonStyle.Secondary).setEmoji('⚙️')
        );

        // Atualiza a mensagem existente se for um clique de botão
        if (interaction.isButton() || interaction.isModalSubmit()) {
            await interaction.message.edit({ embeds: [embed], components: [botoes] });
        } else {
            // Se for o comando inicial do Dono
            await interaction.channel.send({ embeds: [embed], components: [botoes] });
        }
    });
}

// --- 4.2 OUVIDOR DE INTERAÇÕES (PT 4: STAFF) ---
bot.on(Events.InteractionCreate, async i => {
    
    // COMANDO /PAINEL_STAFF (Apenas o Dono configurado no Railway)
    if (i.isChatInputCommand() && i.commandName === 'painel_staff') {
        if (i.user.id !== cfg.dono_id) return i.reply({ content: "❌ Acesso Negado.", ephemeral: true });
        await i.reply({ content: "🚀 Gerando central de rodízio...", ephemeral: true });
        await atualizarPainelStaff(i);
    }

    // LÓGICA DE CLIQUE NOS BOTÕES
    if (i.isButton()) {
        const uid = i.user.id;

        // BOTÃO: ENTRAR NO RODÍZIO
        if (i.customId === 'st_entrar') {
            db.get("SELECT * FROM staff WHERE id = ?", [uid], async (err, row) => {
                // Abre cadastro se o ADM for novo
                if (!row) {
                    const modal = new ModalBuilder().setCustomId('modal_staff_reg').setTitle('📝 REGISTRO DE RECEBIMENTO');
                    const nIn = new TextInputBuilder().setCustomId('reg_nome').setLabel("NOME COMPLETO").setStyle(TextInputStyle.Short).setRequired(true);
                    const pIn = new TextInputBuilder().setCustomId('reg_pix').setLabel("SUA CHAVE PIX").setStyle(TextInputStyle.Short).setRequired(true);
                    modal.addComponents(new ActionRowBuilder().addComponents(nIn), new ActionRowBuilder().addComponents(pIn));
                    return await i.showModal(modal);
                }
                
                // Ativa rodízio no SQLite
                db.run("UPDATE staff SET rodizio = 1 WHERE id = ?", [uid], async () => {
                    await i.reply({ content: "✅ Você entrou no rodízio!", ephemeral: true });
                    await atualizarPainelStaff(i);
                });
            });
        }

        // BOTÃO: SAIR DO RODÍZIO
        if (i.customId === 'st_sair') {
            db.run("UPDATE staff SET rodizio = 0 WHERE id = ?", [uid], async () => {
                await i.reply({ content: "💤 Você saiu do rodízio.", ephemeral: true });
                await atualizarPainelStaff(i);
            });
        }

        // BOTÃO: RESETAR DADOS
        if (i.customId === 'st_reset') {
            db.run("DELETE FROM staff WHERE id = ?", [uid], async () => {
                await i.reply({ content: "🗑️ Dados limpos! Clique em **ENTRAR** para recadastrar.", ephemeral: true });
                await atualizarPainelStaff(i);
            });
        }
    }

    // PROCESSAMENTO DO FORMULÁRIO (MODAL)
    if (i.isModalSubmit() && i.customId === 'modal_staff_reg') {
        const nome = i.fields.getTextInputValue('reg_nome').toUpperCase();
        const pix = i.fields.getTextInputValue('reg_pix');

        db.run("INSERT INTO staff (id, nome, pix, rodizio) VALUES (?, ?, ?, 1)", [i.user.id, nome, pix], async (err) => {
            if (err) return i.reply({ content: "❌ Erro ao salvar cadastro.", ephemeral: true });
            
            await i.reply({ content: `✨ **BEM-VINDO À EQUIPE!**\nNome: \`${nome}\` registrado com sucesso.`, ephemeral: true });
            await atualizarPainelStaff(i);
        });
    }
});

// --- 5.1 FUNÇÃO AUXILIAR: GERADOR DE BOTÕES DINÂMICOS ---
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

// --- 5.2 OUVIDOR DE INTERAÇÕES (FILAS E SLOTS CORRIGIDOS) ---
bot.on(Events.InteractionCreate, async i => {
    if (!i.isButton() && !i.isModalSubmit() && !i.isChatInputCommand()) return;

    // 1. COMANDO /CRIAR_FILA (Sem alterações)
    if (i.isChatInputCommand() && i.commandName === 'criar_fila') {
        const modal = new ModalBuilder().setCustomId('mod_mega_form').setTitle('🚀 JORYEL APOSTAS & ORG');
        modal.addComponents(
            new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('f_tit').setLabel("TÍTULO").setValue("JORYEL APOSTAS & ORG").setStyle(TextInputStyle.Short)),
            new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('f_tipo').setLabel("TIPO").setPlaceholder("Misto").setStyle(TextInputStyle.Short).setRequired(true)),
            new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('f_jog').setLabel("MODO").setPlaceholder("4v4").setStyle(TextInputStyle.Short).setRequired(true)),
            new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('f_prec').setLabel("VALOR ENTRADA").setPlaceholder("10.00").setStyle(TextInputStyle.Paragraph).setRequired(true))
        );
        return await i.showModal(modal);
    }

    // 2. PROCESSANDO GERAÇÃO DE ARENAS (Sem alterações)
    if (i.isModalSubmit() && i.customId === 'mod_mega_form') {
        const inputPlat = i.fields.getTextInputValue('f_tipo').toUpperCase();
        const inputModo = i.fields.getTextInputValue('f_jog');
        const precos = i.fields.getTextInputValue('f_prec').split(',').map(v => v.trim());
        await i.reply({ content: `✨ Gerando arenas...`, ephemeral: true });

        for (const preco of precos) {
            const embed = new EmbedBuilder()
                .setTitle(`🦅 JORYEL APOSTAS & ORG`)
                .setColor("#1a1a1a")
                .setDescription(`🎮 **MODO:**\n${inputModo} ${inputPlat}\n\n💰 **VALOR:**\nR$ ${preco}\n\n👤 **JOGADORES:**\nNenhum 👤 jogador se encontra no ⏳ momento.`)
                .setThumbnail(i.guild.iconURL());

            await i.channel.send({ embeds: [embed], components: [gerarBotoesArena(inputModo, inputPlat, preco)] });
        }
    }

    // 3. LÓGICA DE ENTRADA (CORRIGIDA: TRAVA DE DUPLICIDADE)
    if (i.isButton() && i.customId.startsWith('ent_')) {
        const chaveFila = i.customId; 
        const [, modo, tipo, vCentavos] = i.customId.split('_');
        const idArena = `${modo}_${tipo}_${vCentavos}`;

        // TRAVA: Verifica se o jogador já está em QUALQUER slot desta arena
        let jaEsta = false;
        filas.forEach((lista, chave) => {
            if (chave.includes(idArena) && lista.includes(i.user.id)) jaEsta = true;
        });
        if (jaEsta) return i.reply({ content: "⚠️ Você já está em um slot desta arena! Saia primeiro para trocar.", ephemeral: true });

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

    // 4. SAÍDA DA FILA (CORRIGIDO: REMOVE DE TODOS OS SLOTS DA ARENA)
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
        await i.update({ embeds: [EmbedBuilder.from(i.message.embeds[0]).setDescription(`${baseDesc}👤 **JOGADORES:**\n${txt || "Nenhum 👤 jogador se encontra no ⏳ momento."}`)] });
    }
});

// --- 6.1 FUNÇÃO QUE GERA A ARENA PRIVADA (ATUALIZADA) ---
async function iniciarArenaPrivada(guild, p1, p2, modo, tipo, valorEntrada, regraEscolhida) {
    const categoriaID = cfg.categoria_id;

    // 1. SORTEIA UM ADM DISPONÍVEL NO RODÍZIO
    db.get("SELECT * FROM staff WHERE rodizio = 1 ORDER BY RANDOM() LIMIT 1", async (err, adm) => {
        if (err || !adm) {
            console.log("❌ Erro: Nenhum ADM no rodízio ou erro no DB.", err);
            return;
        }

        try {
            // 2. CRIA O CANAL PRIVADO COM PERMISSÕES DE GESTÃO PARA O BOT
            const canal = await guild.channels.create({
                name: `⏳-aguardando-${valorEntrada.toFixed(0)}`,
                type: ChannelType.GuildText,
                parent: categoriaID,
                permissionOverwrites: [
                    { 
                        id: guild.roles.everyone, 
                        deny: [PermissionFlagsBits.ViewChannel] 
                    },
                    { 
                        id: p1, 
                        allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory] 
                    },
                    { 
                        id: p2, 
                        allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory] 
                    },
                    { 
                        id: adm.id, 
                        allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ManageChannels, PermissionFlagsBits.ReadMessageHistory] 
                    },
                    {
                        id: bot.user.id,
                        // O bot PRECISA de ManageChannels para renomear e apagar o canal depois
                        allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ManageChannels, PermissionFlagsBits.EmbedLinks]
                    }
                ]
            });

            // SALVA NA MEMÓRIA: Dados da partida (Essencial para as travas da PT 7)
            partidas.set(canal.id, { 
                p1, p2, 
                adm: adm, // Salva o objeto completo do ADM (ID, Nome, PIX)
                valor: valorEntrada, 
                modo, tipo, 
                c1: false, c2: false, 
                regra: regraEscolhida 
            });

            // 3. LAYOUT DO PAINEL DE ABERTURA
            const embedConf = new EmbedBuilder()
                .setTitle(`🦅 ARENA FORMADA!`)
                .setColor("#1a1a1a")
                .setDescription(
                    `👥 **Jogadores:** <@${p1}> vs <@${p2}>\n` +
                    `🎮 **Modo:** \`${modo} ${tipo}\`\n` +
                    `💰 **Entrada:** \`R$ ${valorEntrada.toFixed(2)}\`\n\n` +
                    `> Ambos devem clicar em **CONFIRMAR** para o ADM <@${adm.id}> liberar o PIX.`
                )
                .setFooter({ text: "JORYEL APOSTAS & ORG • Respeite as regras!" });

            const btns = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('p_confirmar').setLabel('CONFIRMAR').setStyle(ButtonStyle.Success).setEmoji('✅'),
                new ButtonBuilder().setCustomId('p_cancelar').setLabel('CANCELAR').setStyle(ButtonStyle.Danger).setEmoji('❌')
            );

            await canal.send({ 
                content: `🔔 <@${p1}> <@${p2}> | Arena pronta!`, 
                embeds: [embedConf], 
                components: [btns] 
            });

        } catch (error) {
            console.error("❌ Erro ao criar canal de arena:", error);
        }
    });
}

// --- 7.1 FUNÇÃO DO PAINEL DE VITÓRIA (ADM) ---
async function enviarPainelVitoria(channel, p) {
    const embedVitoria = new EmbedBuilder()
        .setTitle("🏁 GESTÃO DE RESULTADO")
        .setDescription(`ADM <@${p.adm.id}>, use os botões abaixo para finalizar a arena após o jogo.`)
        .setColor("#f04747");

    const row1 = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('vit_comum').setLabel('VITÓRIA').setStyle(ButtonStyle.Success).setEmoji('🏆'),
        new ButtonBuilder().setCustomId('vit_wo').setLabel('VITÓRIA W.O').setStyle(ButtonStyle.Primary).setEmoji('🏳️')
    );

    const row2 = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('vit_rv').setLabel('REVANCHE').setStyle(ButtonStyle.Secondary).setEmoji('🔄'),
        new ButtonBuilder().setCustomId('p_cancelar_gestao').setLabel('CANCELAR').setStyle(ButtonStyle.Danger).setEmoji('❌')
    );

    await channel.send({ 
        content: `📢 **Atenção ADM:** <@${p.adm.id}>`, 
        embeds: [embedVitoria], 
        components: [row1, row2] 
    });
}

// --- 7.2 OUVIDOR DE INTERAÇÕES DA ARENA (COM TRAVAS DE SEGURANÇA) ---
bot.on(Events.InteractionCreate, async i => {
    const p = partidas.get(i.channel.id);
    if (!p) return;

    // 1. COPIAR ID (Liberado para todos os jogadores)
    if (i.isButton() && i.customId.startsWith('copy_')) {
        const idParaCopiar = i.customId.split('_')[1];
        return i.reply({ content: `${idParaCopiar}`, ephemeral: true });
    }

    // 2. CONFIRMAÇÃO INICIAL (Liberado para os jogadores P1 e P2)
    if (i.customId === 'p_confirmar') {
        if (i.user.id !== p.p1 && i.user.id !== p.p2) return i.reply({ content: "❌ Você não faz parte desta arena.", ephemeral: true });
        
        if (i.user.id === p.p1) p.c1 = true;
        if (i.user.id === p.p2) p.c2 = true;
        await i.reply({ content: `✅ <@${i.user.id}> confirmou participação!`, ephemeral: false });

        if (p.c1 && p.c2) {
            await i.message.delete().catch(() => {});
            const embedG = new EmbedBuilder()
                .setTitle("🛠️ GESTÃO DO ADM | JORYEL")
                .setDescription("Ambos confirmaram! Escolha uma opção abaixo.")
                .setColor("#2b2d31");
            const btnG = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('adm_show_pix').setLabel('LIBERAR PIX').setStyle(ButtonStyle.Primary).setEmoji('💸'),
                new ButtonBuilder().setCustomId('adm_abrir_sala').setLabel('POSTAR DADOS').setStyle(ButtonStyle.Secondary).setEmoji('📍')
            );
            await i.channel.send({ content: `<@${p.adm.id}>`, embeds: [embedG], components: [btnG] });
        }
        return;
    }

    // 🛡️ TRAVA DE SEGURANÇA GLOBAL (TUDO ABAIXO SÓ O ADM CONVOCADO OU O DONO)
    const botoesADM = ['adm_show_pix', 'adm_abrir_sala', 'vit_comum', 'vit_wo', 'vit_rv', 'setwin_', 'p_cancelar_gestao'];
    if (botoesADM.some(id => i.customId.startsWith(id))) {
        if (i.user.id !== p.adm.id && i.user.id !== cfg.dono_id) {
            return i.reply({ content: `🚫 **ACESSO NEGADO:** Somente o ADM <@${p.adm.id}> responsável pode realizar esta ação.`, ephemeral: true });
        }
    }

    // --- COMANDOS EXCLUSIVOS DO ADM ---

    // LIBERAR PIX
    if (i.customId === 'adm_show_pix') {
        await i.channel.setName(`💸-pagamento-${p.valor.toFixed(0)}`).catch(() => {});
        const valorTotal = p.valor + cfg.taxa;
        const embedP = new EmbedBuilder()
            .setTitle("💰 DADOS PARA PAGAMENTO")
            .setDescription(`💵 **Valor:** \`R$ ${valorTotal.toFixed(2)}\` (cada)\n👤 **Nome:** \`${p.adm.nome}\`\n🔑 **PIX:** \`${p.adm.pix}\``)
            .setColor("#FEE75C");
        return i.reply({ embeds: [embedP] });
    }

    // ABRIR SALA (MODAL)
    if (i.customId === 'adm_abrir_sala') {
        const modal = new ModalBuilder().setCustomId('mod_sala_dados').setTitle('🎮 DADOS DA SALA');
        modal.addComponents(
            new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('id_s').setLabel("ID DA SALA").setStyle(TextInputStyle.Short).setRequired(true)),
            new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('pw_s').setLabel("SENHA").setStyle(TextInputStyle.Short).setRequired(true))
        );
        return await i.showModal(modal);
    }

    // PROCESSANDO ID E SENHA (MODAL SUBMIT)
    if (i.isModalSubmit() && i.customId === 'mod_sala_dados') {
        const idS = i.fields.getTextInputValue('id_s');
        const pwS = i.fields.getTextInputValue('pw_s');
        await i.channel.setName(`⚔️-em-andamento-${p.valor.toFixed(0)}`).catch(() => {});
        const embedSala = new EmbedBuilder()
            .setColor("#2b2d31")
            .setDescription(`**A sala foi criada!**\n\n↪ **ID:** \`${idS}\`\n↪ **Senha:** \`${pwS}\``);
        const row = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId(`copy_${idS}`).setLabel('Copiar ID').setStyle(ButtonStyle.Secondary));
        await i.reply({ embeds: [embedSala], components: [row] });
        await enviarPainelVitoria(i.channel, p);
        return;
    }

    // VITÓRIA (ABRE MENU DE JOGADORES)
    if (i.customId === 'vit_comum' || i.customId === 'vit_wo') {
        const m1 = await i.guild.members.fetch(p.p1).catch(() => ({ displayName: 'Jogador 1' }));
        const m2 = await i.guild.members.fetch(p.p2).catch(() => ({ displayName: 'Jogador 2' }));
        const menuEscolha = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId(`setwin_${p.p1}`).setLabel(`@${m1.displayName}`).setStyle(ButtonStyle.Success),
            new ButtonBuilder().setCustomId(`setwin_${p.p2}`).setLabel(`@${m2.displayName}`).setStyle(ButtonStyle.Danger)
        );
        return i.reply({ content: "❓ **Quem venceu a arena?**", components: [menuEscolha], ephemeral: true });
    }

    // --- FINALIZAÇÃO E CONTABILIDADE (ATUALIZA RANKING E APAGAR 5S) ---
    if (i.customId.startsWith('setwin_')) {
        const vId = i.customId.split('_')[1]; 
        const pId = (vId === p.p1) ? p.p2 : p.p1;

        await i.update({ content: `✅ Vitória gravada! Atualizando Ranking...`, components: [] }).catch(() => {});

        db.serialize(() => {
            // INSERT OR IGNORE garante que o jogador seja criado se for a 1ª vez
            db.run(`INSERT OR IGNORE INTO usuarios (id, wins, loses, streak) VALUES (?, 0, 0, 0)`, [vId]);
            db.run(`INSERT OR IGNORE INTO usuarios (id, wins, loses, streak) VALUES (?, 0, 0, 0)`, [pId]);
            // Atualiza vitórias e o streak (fogo)
            db.run(`UPDATE usuarios SET wins = wins + 1, streak = streak + 1 WHERE id = ?`, [vId]);
            // Atualiza derrotas e zera o streak
            db.run(`UPDATE usuarios SET loses = loses + 1, streak = 0 WHERE id = ?`, [pId]);
        });

        await i.channel.send(`🏆 **ARENA FINALIZADA!**\nVencedor: <@${vId}>\n*Os dados foram salvos no seu **/perfil**. Canal deletando em 5s...*`);
        
        partidas.delete(i.channel.id);
        setTimeout(async () => { try { await i.channel.delete(); } catch (e) {} }, 5000); 
    }

    // --- LÓGICA DA REVANCHE (RV) ---
    if (i.customId === 'vit_rv') {
        const modalRV = new ModalBuilder().setCustomId('mod_rv').setTitle('🔄 CONFIGURAR REVANCHE');
        modalRV.addComponents(new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('v_rv').setLabel("NOVO VALOR").setStyle(TextInputStyle.Short).setRequired(true)));
        return await i.showModal(modalRV);
    }

    if (i.isModalSubmit() && i.customId === 'mod_rv') {
        const novoV = parseFloat(i.fields.getTextInputValue('v_rv').replace(',', '.'));
        p.valor = novoV; p.c1 = false; p.c2 = false; 
        await i.reply({ content: `🔄 **REVANCHE DEFINIDA!** Valor: R$ ${novoV.toFixed(2)}.\nOs jogadores devem confirmar participação novamente no painel acima.` });
        try { await i.channel.setName(`⏳-revanche-${novoV.toFixed(0)}`); } catch (e) {}
    }

    // CANCELAR (Pelo ADM no painel de gestão)
    if (i.customId === 'p_cancelar_gestao') {
        await i.reply("❌ **ARENA CANCELADA PELO ADM.** Apagando em 5 segundos...");
        partidas.delete(i.channel.id);
        setTimeout(async () => { try { await i.channel.delete(); } catch (e) {} }, 5000);
    }

    // CANCELAR (Início pelos jogadores)
    if (i.customId === 'p_cancelar') {
        if (i.user.id !== p.p1 && i.user.id !== p.p2) return i.reply({ content: "❌ Sem permissão.", ephemeral: true });
        await i.reply("❌ **ARENA CANCELADA.** Deletando...");
        partidas.delete(i.channel.id);
        setTimeout(async () => { try { await i.channel.delete(); } catch (e) {} }, 5000);
    }
});
