// ==================================
//    🤖 B0T-ANALISTA-FF | SISTEMA CLIENTE
// ==================================

const { Client, GatewayIntentBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ModalBuilder, TextInputBuilder, TextInputStyle, PermissionFlagsBits, ChannelType, Events } = require('discord.js');
const fs = require('fs');

// 🔗 LINK DA LOJINHA MESTRE (ONDE VAI VERIFICAR)
const LINK_MESTRE = "https://seu-link-da-lojinha.com"; 

// ==================================
//    ⚙️ CONFIGURAÇÕES
// ==================================
const config = {
    nome: "b0t-analista-ff 📈",
    cor: "#5D3FD3", // Cor Roxa ou a que escolher
    logo: "URL_DA_LOGO_AQUI",
    token: "SEU_TOKEN_AQUI"
};

// ==================================
//    📂 DADOS E BANCO LOCAL
// ==================================
let dados = {
    ativado: false,
    dono: "",
    validade: "",
    canal_painel: "",
    cargo_mob: "",
    cargo_pc: ""
};

// Carrega se já tiver dados salvos
if(fs.existsSync('./dados.json')){
    dados = JSON.parse(fs.readFileSync('./dados.json', 'utf8'));
}

function salvarDados(){
    fs.writeFileSync('./dados.json', JSON.stringify(dados, null, 2));
}

// ==================================
//    🤖 INSTÂNCIA DO BOT
// ==================================
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers
    ]
});

// ==================================
//    🔓 TELA INICIAL / BLOQUEIO
// ==================================
client.on('ready', async () => {
    console.log("💻 BOT LIGADO!");
    console.log("🔍 VERIFICANDO LICENÇA NA LOJINHA...");

    if(!dados.ativado){
        const embedBloqueado = new EmbedBuilder()
        .setTitle("🔒 SISTEMA BLOQUEADO | AGUARDANDO KEY")
        .setColor(config.cor)
        .setDescription(`
╔══════════════════════════════════════════════════════╗
║ 🔒 SISTEMA BLOQUEADO | ATIVE SUA LICENÇA          ║
╚══════════════════════════════════════════════════════╝

┌──────────────────────────────────────────────────────┐
│                                                     
│ ⚠️  ESTE SISTEMA SÓ FUNCIONA COM UMA KEY VÁLIDA!   
│                                                     
│ 📋 COMO ATIVAR:                                    
│  DIGITE: !ativar SUA_KEY                 
│                                                     
│ ℹ️  INFORMAÇÕES:                                   
│  • Sistema Oficial b0t-analista-ff                 
│  • Verificação em tempo real na Lojinha.           
│                                                     
│ ⌛ STATUS: AGUARDANDO ATIVAÇÃO...                  
│                                                     
└──────────────────────────────────────────────────────┘
        `);

        // Tenta achar o canal para enviar
        const canal = client.channels.cache.find(c => c.type === 0); 
        if(canal) await canal.send({ embeds: [embedBloqueado] });

    } else {
        console.log("✅ SISTEMA JÁ ATIVADO!");
        // Aqui depois ele manda o painel
    }
});

// ==================================
//    🔑 SISTEMA DE ATIVAÇÃO
// ==================================
client.on('messageCreate', async message => {
    if(message.author.bot) return;

    // --- COMANDO DE ATIVAÇÃO ---
    if(message.content.startsWith('!ativar')){
        const key = message.content.split(' ')[1];

        if(!key){
            return message.reply("❌ **ERRO:** Digite uma Key! \n`!ativar [SUA_KEY]`");
        }

        try {
            // 🔗 CONEXÃO COM A LOJINHA MESTRE
            const resp = await fetch(`${LINK_MESTRE}/verificar?key=${key}`);
            const res = await resp.json();

            if(!res.valido){
                return message.reply(`❌ **CHAVE INVÁLIDA!**\n${res.motivo}`);
            }

            // ✅ KEY OFICIAL APROVADA!
            dados.ativado = true;
            dados.dono = message.author.id;
            dados.validade = res.validade;
            salvarDados();

            // --- TELA DE SUCESSO ---
            const embedSucesso = new EmbedBuilder()
            .setTitle("✅ SISTEMA ATIVADO COM SUCESSO!")
            .setColor(config.cor)
            .setDescription(`
╔══════════════════════════════════════════════════════╗
║ ✅ SISTEMA ATIVADO COM SUCESSO!                     ║
╚══════════════════════════════════════════════════════╝

┌──────────────────────────────────────────────────────┐
│                                                     
│ 🤖 NOME: b0t-analista-ff 📈                             
│ 🎨 COR: ${config.cor}                             
│ 🖼️  LOGO: [ ${config.logo} ]                          
│                                                     
│ 📁 BANCO DE DADOS: LIGADO ✅                       
│    Lista de analistas salva no sistema              
│                                                     
│ 📡 SISTEMA DE RODÍZIO: ATIVO 🟢                    
│ ID DO CANAL QUE IRA APARECER O PAINEL DE RODÍZIO SS.                  
│    Separando por plataforma automaticamente        
│                                                     
│ 📱 ANALISTA CELULAR/MOB: [ ${dados.cargo_mob || "VAZIO"} ]                   
│    Analistas que analisam partidas de celular      
│                                                     
│ 🖥️  ANALISTA PC/EMU: [ ${dados.cargo_pc || "VAZIO"} ]                   
│    Analistas que analisam partidas de PC           
│                                                     
│ ⏳ VALIDADE: ${dados.validade}                             
│                                                     
│ 📢 SISTEMA DE ESCALAÇÃO 100% OPERACIONAL!          
│                                                     
└──────────────────────────────────────────────────────┘
            `);

            await message.reply({ embeds: [embedSucesso] });
            console.log("✅ BOT ATIVADO POR: " + message.author.tag + " | KEY OFICIAL");

        } catch (error) {
            console.error(error);
            return message.reply("❌ **ERRO DE CONEXÃO:** Não foi possível verificar na Lojinha Mestre!");
        }
    }
});

// ==================================
//    📋 ENVIAR PAINEL AUTOMATICAMENTE
// ==================================
client.on('ready', async () => {
    console.log("💻 BOT LIGADO!");
    console.log("🔍 VERIFICANDO LICENÇA NA LOJINHA...");

    if(dados.ativado){
        console.log("✅ SISTEMA ATIVADO!");
        const canal = client.channels.cache.get(dados.canal_painel);
        if(canal){
            await enviarPainel(canal);
        }
    }
});

// ==================================
//    🖼️  FUNÇÃO DO PAINEL
// ==================================
async function enviarPainel(canal) {
    const qtdMob = filaMob.length;
    const qtdPc = filaPc.length;

    const embedPainel = new EmbedBuilder()
    .setTitle("🔄 CENTRAL DE RODÍZIO | ESCALA AUTOMÁTICA")
    .setColor(config.cor)
    .setDescription(`
╔══════════════════════════════════════════════════════╗
║ 🔄 CENTRAL DE RODÍZIO | ESCALA AUTOMÁTICA         ║
╚══════════════════════════════════════════════════════╝

┌──────────────────────────────────────────────────────┐
│                                                     
│ 🎮 SELECIONE A PLATAFORMA DA PARTIDA:             
│                                                     
│ 📱 | ANALISTA CELULAR/MOB
│    Chamar analista para partida Mobile
│          ${qtdMob}@                                           
│                                                     
│ 🖥️  | ANALISTA PC/EMU
│    Chamar analista para partida de PC              
│    dossmob |     ${qtdPc}@dossemu                                             
│                                                     
│ 📋 | LISTA GERAL
│    Ver todos os analistas e quantidades            
│                                                     
│ 🕒 SISTEMA ONLINE: 24H POR DIA                    
│                                                     
│                                                     
│                                                     
└──────────────────────────────────────────────────────┘
    `);

    const botoes = new ActionRowBuilder()
    .addComponents(
        new ButtonBuilder()
        .setCustomId('entrar_rodizio')
        .setLabel('entrar no rodízio')
        .setStyle(ButtonStyle.Success),

        new ButtonBuilder()
        .setCustomId('sair_rodizio')
        .setLabel('sair do rodízio')
        .setStyle(ButtonStyle.Danger)
    );

    await canal.send({ embeds: [embedPainel], components: [botoes] });
}

// ==================================
//    🔘 BOTÃO ENTRAR / SAIR
// ==================================
client.on('interactionCreate', async interaction => {
    if (!interaction.isButton()) return;

    // --- BOTÃO ENTRAR ---
    if (interaction.customId === 'entrar_rodizio') {
        
        const embedEscolha = new EmbedBuilder()
        .setTitle("🎮 SELECIONE SUA PLATAFORMA")
        .setColor(config.cor)
        .setDescription(`
╔══════════════════════════════════════════════════════╗
║ 🎮 SELECIONE SUA PLATAFORMA                       ║
╚══════════════════════════════════════════════════════╝

┌──────────────────────────────────────────────────────┐
│                                                     
│ 📝 VOCÊ ESTÁ SE CADASTRANDO NA FILA!              
│                                                     
│ 🎮 ESCOLHA ABAIXO QUAL VOCÊ É:                    
│                                                     
│ 📱 | MOBILE / CELULAR                             
│    Para analisar partidas de celular               
│                                                     
│ 🖥️  | PC / EMULADOR                               
│    Para analisar partidas de PC                    
│                                                     
│ ✅ APÓS CLICAR, VOCÊ ENTRA NA FILA!               
│                                                     
│           📱 entrar mob | 🖥️  entrar pc           
│                                                     
└──────────────────────────────────────────────────────┘
        `);

        const botoesEscolha = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
            .setCustomId('escolher_mob')
            .setLabel('📱 ENTRAR MOB')
            .setStyle(ButtonStyle.Primary),

            new ButtonBuilder()
            .setCustomId('escolher_pc')
            .setLabel('🖥️ ENTRAR PC')
            .setStyle(ButtonStyle.Secondary)
        );

        await interaction.reply({ embeds: [embedEscolha], components: [botoesEscolha], ephemeral: true });
    }

    // --- BOTÃO SAIR ---
    if (interaction.customId === 'sair_rodizio') {
        // Remove da lista
        filaMob = filaMob.filter(id => id !== interaction.user.id);
        filaPc = filaPc.filter(id => id !== interaction.user.id);

        const embedSair = new EmbedBuilder()
        .setTitle("❌ SAIR DA FILA")
        .setColor("#ff0000")
        .setDescription(`
╔══════════════════════════════════════════════════════╗
║ ❌ VOCÊ SAIU DA FILA!                             ║
╚══════════════════════════════════════════════════════╝

┌──────────────────────────────────────────────────────┐
│                                                     
│ 📝 VOCÊ FOI REMOVIDO DA LISTA DE ESPERA!          
│                                                     
│ 📢 QUANDO QUISER TRABALHAR NOVAMENTE, É SÓ CLICAR 
│    EM ENTRAR NO RODÍZIO NOVAMENTE!                
│                                                     
└──────────────────────────────────────────────────────┘
        `);

        await interaction.reply({ embeds: [embedSair], ephemeral: true });
        
        // Atualiza o painel
        const canal = client.channels.cache.get(dados.canal_painel);
        if(canal) {
            await canal.bulkDelete(1);
            await enviarPainel(canal);
        }
    }
});

// ==================================
//    📥 SISTEMA DE ENTRADA NA FILA
// ==================================
client.on('interactionCreate', async interaction => {
    if (!interaction.isButton()) return;

    // --- BOTÃO: ENTRAR MOBILE ---
    if (interaction.customId === 'escolher_mob') {
        
        // Verifica se já não está na fila
        if(filaMob.includes(interaction.user.id)){
            return interaction.reply({ 
                content: "❌ Você já está na fila Mobile!", 
                ephemeral: true 
            });
        }

        // Adiciona na fila
        filaMob.push(interaction.user.id);

        const embedEntrou = new EmbedBuilder()
        .setTitle("✅ VOCÊ ENTROU NA FILA | MOBILE")
        .setColor(config.cor)
        .setDescription(`
╔══════════════════════════════════════════════════════╗
║ ✅ VOCÊ ENTROU NA FILA | MOBILE                    ║
╚══════════════════════════════════════════════════════╝

┌──────────────────────────────────────────────────────┐
│                                                     
│ 📱 VOCÊ É: ANALISTA MOBILE/CELULAR                
│                                                     
│ 📍 SUA POSIÇÃO: #${filaMob.length} NA FILA               
│                                                     
│ 📢 AGUARDE, QUANDO CHEGAR SUA VEZ VOCÊ É          
│    CHAMADO AUTOMATICAMENTE NO CHAT!               
│                                                     
│ 🟢 STATUS: DISPONÍVEL PARA TRABALHAR!             
│                                                     
└──────────────────────────────────────────────────────┘
        `);

        await interaction.update({ embeds: [embedEntrou], components: [] });
        
        // Atualiza o painel principal
        await atualizarPainel();
    }

    // --- BOTÃO: ENTRAR PC ---
    if (interaction.customId === 'escolher_pc') {
        
        // Verifica se já não está na fila
        if(filaPc.includes(interaction.user.id)){
            return interaction.reply({ 
                content: "❌ Você já está na fila PC!", 
                ephemeral: true 
            });
        }

        // Adiciona na fila
        filaPc.push(interaction.user.id);

        const embedEntrou = new EmbedBuilder()
        .setTitle("✅ VOCÊ ENTROU NA FILA | PC")
        .setColor(config.cor)
        .setDescription(`
╔══════════════════════════════════════════════════════╗
║ ✅ VOCÊ ENTROU NA FILA | PC                       ║
╚══════════════════════════════════════════════════════╝

┌──────────────────────────────────────────────────────┐
│                                                     
│ 🖥️  VOCÊ É: ANALISTA PC/EMULADOR                
│                                                     
│ 📍 SUA POSIÇÃO: #${filaPc.length} NA FILA               
│                                                     
│ 📢 AGUARDE, QUANDO CHEGAR SUA VEZ VOCÊ É          
│    CHAMADO AUTOMATICAMENTE NO CHAT!               
│                                                     
│ 🟢 STATUS: DISPONÍVEL PARA TRABALHAR!             
│                                                     
└──────────────────────────────────────────────────────┘
        `);

        await interaction.update({ embeds: [embedEntrou], components: [] });
        
        // Atualiza o painel principal
        await atualizarPainel();
    }
});

// ==================================
//    🔄 FUNÇÃO DE ATUALIZAR PAINEL
// ==================================
async function atualizarPainel() {
    const canal = client.channels.cache.get(dados.canal_painel);
    if(!canal) return;

    // Apaga a mensagem antiga
    const mensagens = await canal.messages.fetch({ limit: 10 });
    const msgAntiga = mensagens.find(m => m.author.id === client.user.id && m.embeds.length > 0);
    if(msgAntiga) await msgAntiga.delete();

    // Envia a nova com os números atualizados
    const embed = new EmbedBuilder()
    .setTitle("🔄 CENTRAL DE RODÍZIO | ESCALA AUTOMÁTICA")
    .setColor(config.cor)
    .setDescription(`
╔══════════════════════════════════════════════════════╗
║ 🔄 CENTRAL DE RODÍZIO | ESCALA AUTOMÁTICA         ║
╚══════════════════════════════════════════════════════╝

┌──────────────────────────────────────────────────────┐
│                                                     
│ 🎮 SELECIONE A PLATAFORMA DA PARTIDA:             
│                                                     
│ 📱 | ANALISTA CELULAR/MOB
│    Chamar analista para partida Mobile
│          ${filaMob.length}@                                           
│                                                     
│ 🖥️  | ANALISTA PC/EMU
│    Chamar analista para partida de PC              
│          ${filaPc.length}@                                             
│                                                     
│ 📋 | LISTA GERAL
│    Ver todos os analistas e quantidades            
│                                                     
│ 🕒 SISTEMA ONLINE: 24H POR DIA                    
│                                                     
└──────────────────────────────────────────────────────┘
    `);

    const botoes = new ActionRowBuilder()
    .addComponents(
        new ButtonBuilder()
        .setCustomId('entrar_rodizio')
        .setLabel('entrar no rodízio')
        .setStyle(ButtonStyle.Success),

        new ButtonBuilder()
        .setCustomId('sair_rodizio')
        .setLabel('sair do rodízio')
        .setStyle(ButtonStyle.Danger)
    );

    await canal.send({ embeds: [embed], components: [botoes] });
                                  }

// ==================================
//    🎯 COMANDOS DE ADMINISTRADOR
// ==================================
client.on('messageCreate', async message => {
    if(message.author.bot) return;

    // Verifica se é dono ou tem permissão
    if(message.author.id !== dados.dono) return;

    // --- COMANDO: +ss mob ---
    if(message.content === '+ss mob'){
        if(filaMob.length === 0){
            return message.reply("❌ **NENHUM ANALISTA NA FILA MOBILE!**");
        }

        // Pega o PRIMEIRO da fila
        const userId = filaMob.shift();
        const usuario = await client.users.fetch(userId);

        // --- TELA DE CHAMADA ---
        const embedChamado = new EmbedBuilder()
        .setTitle("📢 CHAMADA DE ANALISTA | MOBILE")
        .setColor("#00FF00")
        .setDescription(`
╔══════════════════════════════════════════════════════╗
║ 📢 CHAMADA DE ANALISTA | MOBILE                    ║
╚══════════════════════════════════════════════════════╝

┌──────────────────────────────────────────────────────┐
│                                                     
│ 👤 **ANALISTA:** ${usuario.tag}             
│ 🆔 **ID:** ${userId}                        
│                                                     
│ 📱 **PLATAFORMA:** MOBILE/CELULAR           
│                                                     
│ 🎯 **STATUS:** CHAMADO PARA ATENDIMENTO!           
│                                                     
│ ✅ **VOCÊ JÁ PODE IR FAZER O SERVIÇO!**            
│                                                     
└──────────────────────────────────────────────────────┘
        `);

        await message.reply({ 
            content: `${usuario}`, 
            embeds: [embedChamado] 
        });

        // Atualiza o painel com a nova quantidade
        await atualizarPainel();
    }

    // --- COMANDO: +ss pc ---
    if(message.content === '+ss pc'){
        if(filaPc.length === 0){
            return message.reply("❌ **NENHUM ANALISTA NA FILA PC!**");
        }

        // Pega o PRIMEIRO da fila
        const userId = filaPc.shift();
        const usuario = await client.users.fetch(userId);

        // --- TELA DE CHAMADA ---
        const embedChamado = new EmbedBuilder()
        .setTitle("📢 CHAMADA DE ANALISTA | PC")
        .setColor("#00FF00")
        .setDescription(`
╔══════════════════════════════════════════════════════╗
║ 📢 CHAMADA DE ANALISTA | PC                       ║
╚══════════════════════════════════════════════════════╝

┌──────────────────────────────────────────────────────┐
│                                                     
│ 👤 **ANALISTA:** ${usuario.tag}             
│ 🆔 **ID:** ${userId}                        
│                                                     
│ 🖥️  **PLATAFORMA:** PC/EMULADOR           
│                                                     
│ 🎯 **STATUS:** CHAMADO PARA ATENDIMENTO!           
│                                                     
│ ✅ **VOCÊ JÁ PODE IR FAZER O SERVIÇO!**            
│                                                     
└──────────────────────────────────────────────────────┘
        `);

        await message.reply({ 
            content: `${usuario}`, 
            embeds: [embedChamado] 
        });

        // Atualiza o painel
        await atualizarPainel();
    }
});

// ==================================
//    ⚙️ COMANDOS DE CONFIGURAÇÃO
// ==================================
client.on('messageCreate', async message => {
    if(message.author.bot) return;
    if(message.author.id !== dados.dono) return; // Só o dono pode configurar

    // --- COMANDO: !setcanal ---
    if(message.content.startsWith('!setcanal')){
        const canal = message.mentions.channels.first();

        if(!canal){
            return message.reply("❌ **ERRO:** Mencione um canal! \n`!setcanal #canal-ss`");
        }

        dados.canal_painel = canal.id;
        salvarDados();

        const embed = new EmbedBuilder()
        .setTitle("✅ CANAL CONFIGURADO!")
        .setColor(config.cor)
        .setDescription(`
╔══════════════════════════════════════════════════════╗
║ ✅ CANAL CONFIGURADO COM SUCESSO!                   ║
╚══════════════════════════════════════════════════════╝

┌──────────────────────────────────────────────────────┐
│                                                     
│ 📌 **CANAL:** ${canal}                     
│ 📍 **FUNÇÃO:** O painel vai aparecer aqui!         
│                                                     
└──────────────────────────────────────────────────────┘
        `);

        await message.reply({ embeds: [embed] });
        
        // Envia o painel automaticamente
        await enviarPainel(canal);
    }

    // --- COMANDO: !setcargomob ---
    if(message.content.startsWith('!setcargomob')){
        const cargo = message.mentions.roles.first();

        if(!cargo){
            return message.reply("❌ **ERRO:** Mencione um cargo! \n`!setcargomob @Analista Mobile`");
        }

        dados.cargo_mob = cargo.id;
        salvarDados();

        const embed = new EmbedBuilder()
        .setTitle("✅ CARGO MOBILE CONFIGURADO!")
        .setColor(config.cor)
        .setDescription(`
╔══════════════════════════════════════════════════════╗
║ ✅ CARGO CONFIGURADO COM SUCESSO!                   ║
╚══════════════════════════════════════════════════════╝

┌──────────────────────────────────────────────────────┐
│                                                     
│ 🏷️  **CARGO:** ${cargo}                     
│ 📱 **TIPO:** Analista Mobile/Celular               
│                                                     
└──────────────────────────────────────────────────────┘
        `);

        await message.reply({ embeds: [embed] });
    }

    // --- COMANDO: !setcargopc ---
    if(message.content.startsWith('!setcargopc')){
        const cargo = message.mentions.roles.first();

        if(!cargo){
            return message.reply("❌ **ERRO:** Mencione um cargo! \n`!setcargopc @Analista PC`");
        }

        dados.cargo_pc = cargo.id;
        salvarDados();

        const embed = new EmbedBuilder()
        .setTitle("✅ CARGO PC CONFIGURADO!")
        .setColor(config.cor)
        .setDescription(`
╔══════════════════════════════════════════════════════╗
║ ✅ CARGO CONFIGURADO COM SUCESSO!                   ║
╚══════════════════════════════════════════════════════╝

┌──────────────────────────────────────────────────────┐
│                                                     
│ 🏷️  **CARGO:** ${cargo}                     
│ 🖥️  **TIPO:** Analista PC/Emulador                 
│                                                     
└──────────────────────────────────────────────────────┘
        `);

        await message.reply({ embeds: [embed] });
    }

    // --- COMANDO: !info ---
    if(message.content === '!info'){
        const embedInfo = new EmbedBuilder()
        .setTitle("ℹ️  INFORMAÇÕES DO SISTEMA")
        .setColor(config.cor)
        .setDescription(`
╔══════════════════════════════════════════════════════╗
║ ℹ️  INFORMAÇÕES DO SISTEMA b0t-analista-ff         ║
╚══════════════════════════════════════════════════════╝

┌──────────────────────────────────────────────────────┐
│                                                     
│ 👑 **DONO:** <@${dados.dono}>               
│ ⏳ **VALIDADE:** ${dados.validade}            
│                                                     
│ 📌 **CANAL:** <#${dados.canal_painel || "NÃO DEFINIDO"}>      
│ 📱 **CARGO MOB:** <@&${dados.cargo_mob || "NÃO DEFINIDO"}>   
│ 🖥️  **CARGO PC:** <@&${dados.cargo_pc || "NÃO DEFINIDO"}>    
│                                                     
│ 🔗 **SISTEMA:** Oficial | Verificado na Lojinha    
│                                                     
└──────────────────────────────────────────────────────┘
        `);

        await message.reply({ embeds: [embedInfo] });
    }
});
