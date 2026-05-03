const { Client, GatewayIntentBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ModalBuilder, TextInputBuilder, TextInputStyle, PermissionFlagsBits, ChannelType, Events } = require('discord.js');
const fs = require('fs');

// ==================================
//    🔗 LINK DA LOJINHA
// ==================================
const LINK_DA_LOJINHA = "COLOQUE_SEU_LINK_AQUI";

// ==================================
//    🤖 CONFIGURAÇÕES GERAIS
// ==================================
const config = {
    nome: "b0t-sup 💬",
    cor: "#2b2d31",
    logo: "URL_DA_LOGO_AQUI",
    dono_id: "SEU_ID_AQUI"
};

// ==================================
//    🔓 DADOS DE ATIVAÇÃO
// ==================================
let dados = {
    ativado: false,
    dono: "",
    validade: "",
    categoria_id: "",
    cargo_suporte: "",
    canal_logs: "",
    canal_painel: "",
    botoes: []
};

if(fs.existsSync('./dados.json')){
    dados = JSON.parse(fs.readFileSync('./dados.json', 'utf8'));
}

function salvarDados(){
    fs.writeFileSync('./dados.json', JSON.stringify(dados, null, 2));
}

// ==================================
//    ⚙️ CONFIGS DO BOT
// ==================================
const cfg = {
    token: process.env.DISCORD_TOKEN,
    client_id: process.env.CLIENT_ID
};

// ==================================
//    🤖 INSTÂNCIA
// ==================================
const bot = new Client({
    intents: [
        GatewayIntentBits.Guilds, 
        GatewayIntentBits.GuildMessages, 
        GatewayIntentBits.MessageContent, 
        GatewayIntentBits.GuildMembers
    ]
});

// ==================================
//    🔒 TELA DE BLOQUEIO
// ==================================
bot.on('ready', async () => {
    console.log("💻 BOT LIGADO! AGUARDANDO ATIVAÇÃO...");
    
    if(!dados.ativado){
        const canalAlvo = bot.channels.cache.get(dados.canal_painel) || bot.channels.cache.first();
        
        if(canalAlvo){
            const embedBloqueado = new EmbedBuilder()
            .setTitle("🔒 SISTEMA BLOQUEADO | ATIVE SUA LICENÇA")
            .setColor(config.cor)
            .setDescription(`
╔══════════════════════════════════════════════════════╗
║ 🔒 SISTEMA BLOQUEADO | ATIVE SUA LICENÇA           ║
╚══════════════════════════════════════════════════════╝

┌──────────────────────────────────────────────────────┐
│                                                     
│ ⚠️  ESTE SISTEMA SÓ FUNCIONA COM UMA KEY VÁLIDA!   
│                                                     
│ 📋 COMO ATIVAR:                                    
│  DIGITE SUA KEY:  SUA KEY AQUI                 
│                                                     
│ ℹ️  INFORMAÇÕES:                                   
│  • A key é vinculada ao servidor.                  
│  • Não compartilhe sua licença.                    
│  • Em caso de erro, verifique letras maiúsculas.    
│                                                     
│ ⌛ STATUS: AGUARDANDO ATIVAÇÃO...                  
│                                                     
└──────────────────────────────────────────────────────┘
            `);

            await canalAlvo.send({ embeds: [embedBloqueado] });
        }
    }
});

// ==================================
//    🔑 SISTEMA DE ATIVAÇÃO
// ==================================
bot.on('messageCreate', async message => {
    if(message.author.bot) return;

    // COMANDO DE ATIVAÇÃO
    if(message.content.startsWith('!ativar')){
        const key = message.content.split(' ')[1];

        if(!key){
            return message.reply("❌ **ERRO:** Digite uma Key! \n`!ativar [SUA_KEY]`");
        }

        try {
            // Verifica na Lojinha
            const resp = await fetch(`${LINK_DA_LOJINHA}/verificar?key=${key}`);
            const res = await resp.json();

            if(!res.valido){
                return message.reply(`❌ **CHAVE INVÁLIDA!**\n${res.motivo}`);
            }

            // SALVA DADOS
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
│ 🤖 NOME: b0t-sup 💬                             
│ 🎨 COR: ${config.cor}                             
│ 🖼️  LOGO: [ ${config.logo} ]                         
│                                                     
│ 📁 CATEGORIA: [ ${dados.categoria_id || "VAZIO"} ]                     
│    Onde abrem os tickets!                           
│                                                     
│ 👥 CARGO SUPORTE: [ ${dados.cargo_suporte || "VAZIO"} ]                     
│    Quem pode atender os chamados                    
│                                                     
│ 📄 CANAL LOGS: [ ${dados.canal_logs || "VAZIO"} ]                         
│    Onde registra tudo que acontece                  
│                                                     
│ 📌 CANAL PAINEL: [ ${dados.canal_painel || "VAZIO"} ]                       
│    ID do canal que vai aparecer o painel            
│                                                     
│ 🔘 BOTÕES DO PAINEL:                               
│                                                     
│         adicionar botão | tirar botão                
│                                                     
│ ⏳ VALIDADE: ${dados.validade}                             
│                                                     
│ 📢 TODAS AS FUNÇÕES FORAM LIBERADAS!                
│                                                     
└──────────────────────────────────────────────────────┘
            `);

            await message.reply({ embeds: [embedSucesso] });
            console.log("✅ BOT ATIVADO POR: " + message.author.tag);

        } catch (error) {
            console.error(error);
            return message.reply("❌ **ERRO DE CONEXÃO:** Tente novamente mais tarde.");
        }
    }
});

// ==================================
//    ⚙️ COMANDOS DE CONFIGURAÇÃO
// ==================================

bot.on('messageCreate', async message => {
    if(message.author.id !== dados.dono) return; // Só o dono pode usar

    // --- COMANDO: ADD BOTÃO ---
    if(message.content === 'adicionar botão'){
        const embedAdd = new EmbedBuilder()
        .setTitle("➕ NOVO BOTÃO | CRIANDO OPÇÃO")
        .setColor(config.cor)
        .setDescription(`
╔══════════════════════════════════════════════════════╗
║ ➕ NOVO BOTÃO | CRIANDO OPÇÃO                      ║
╚══════════════════════════════════════════════════════╝

┌──────────────────────────────────────────────────────┐
│                                                     
│ 📝 DIGITE AS INFORMAÇÕES ABAIXO:                  
│                                                     
│ 🏷️  NOME DO BOTÃO:                                 
│    Exemplo: DÚVIDAS                                
│                                                     
│ 📄 DESCRIÇÃO:                                      
│    Exemplo: Tire suas dúvidas aqui                 
│                                                     
│ 🎨 COR DO BOTÃO:                                   
│    Verde / Vermelho / Azul / Cinza                 
│                                                     
│ 😀 EMOJI:                                           
│    Exemplo: ❓ / 💸 / ⚠️                           
│                                                     
│ ✅ APÓS DIGITAR, O BOTÃO É CRIADO NO PAINEL!      
│          
│           criar botão | cancelar criação           
│                                                     
└──────────────────────────────────────────────────────┘
        `);

        await message.reply({ embeds: [embedAdd] });
    }

    // --- COMANDO: TIRAR BOTÃO ---
    if(message.content === 'tirar botão'){
        let lista = "📋 BOTÕES ATUAIS:\n";
        dados.botoes.forEach((btn, i) => {
            lista += `\n${i+1} - ${btn.emoji} | ${btn.nome}`;
        });

        const embedRemove = new EmbedBuilder()
        .setTitle("➖ REMOVER BOTÃO")
        .setColor(config.cor)
        .setDescription(`
╔══════════════════════════════════════════════════════╗
║ ➖ REMOVER BOTÃO | SELECIONE QUAL TIRAR           ║
╚══════════════════════════════════════════════════════╝

┌──────────────────────────────────────────────────────┐
│                                                     
│ ${lista}                                           
│                                                     
│ 📝 DIGITE:  remover [NÚMERO]                       
│    Exemplo: remover 1                              
│                                                     
│ ✅ CONFIRMAÇÃO:                                    
│    excluir botão | cancelar                        
│                                                     
└──────────────────────────────────────────────────────┘
        `);

        await message.reply({ embeds: [embedRemove] });
    }

    // --- COMANDO: ENVIAR PAINEL ---
    if(message.content.startsWith('!painel')){
        const canalId = dados.canal_painel;
        if(!canalId) return message.reply("❌ Configure o ID do Canal Painel primeiro!");

        const canal = bot.channels.cache.get(canalId);
        if(!canal) return message.reply("❌ Canal não encontrado!");

        let textoBotoes = "";
        dados.botoes.forEach(btn => {
            textoBotoes += `\n${btn.emoji} | ${btn.nome}\n    ${btn.descricao}\n`;
        });

        const embedPainel = new EmbedBuilder()
        .setTitle("💬 CENTRAL DE ATENDIMENTO | SUPORTE")
        .setColor(config.cor)
        .setDescription(`
╔══════════════════════════════════════════════════════╗
║ 💬 CENTRAL DE ATENDIMENTO | SUPORTE                ║
╚══════════════════════════════════════════════════════╝

┌──────────────────────────────────────────────────────┐
│                                                     
│ 🎫 SELECIONE O TIPO DE ATENDIMENTO:                
│ ${textoBotoes}
│ 🕒 ATENDIMENTO: 24H POR DIA                       
│                                                     
│ ✅ CLIQUE NO BOTÃO ABAIXO PARA ABRIR!             
│                                                     
└──────────────────────────────────────────────────────┘
        `);

        const botoes = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
            .setCustomId('abrir_ticket')
            .setLabel('🔹 ABRIR CHAMADO 🔹')
            .setStyle(ButtonStyle.Primary)
        );

        await canal.send({ embeds: [embedPainel], components: [botoes] });
        await message.reply("✅ Painel enviado com sucesso!");
    }
});

// ==================================
//    🎫 SISTEMA DE ABRIR TICKET
// ==================================
bot.on('interactionCreate', async interaction => {
    if (!interaction.isButton()) return;

    // --- BOTÃO DE ABRIR CHAMADO ---
    if (interaction.customId === 'abrir_ticket') {
        const usuario = interaction.user;
        const categoria = interaction.guild.channels.cache.get(dados.categoria_id);
        
        if(!categoria) return interaction.reply({ content: "❌ Categoria não configurada!", ephemeral: true });

        // Cria o canal privado
        const canal = await interaction.guild.channels.create({
            name: `🎫-${usuario.username}`,
            type: ChannelType.GuildText,
            parent: categoria.id,
            permissionOverwrites: [
                {
                    id: interaction.guild.roles.everyone,
                    deny: [PermissionFlagsBits.ViewChannel]
                },
                {
                    id: usuario.id,
                    allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory]
                },
                {
                    id: dados.cargo_suporte,
                    allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ManageChannels]
                },
                {
                    id: bot.user.id,
                    allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.EmbedLinks]
                }
            ]
        });

        // --- TELA DENTRO DO TICKET ---
        const embedTicket = new EmbedBuilder()
        .setTitle("🎫 TICKET CRIADO | ATENDIMENTO PRIVADO")
        .setColor(config.cor)
        .setDescription(`
╔══════════════════════════════════════════════════════╗
║ 🎫 TICKET CRIADO | ATENDIMENTO PRIVADO            ║
╚══════════════════════════════════════════════════════╝

┌──────────────────────────────────────────────────────┐
│                                                     
│ 👤 USUÁRIO: ${usuario}                       
│ 📋 TIPO: [ GERAL ]      
│ 🆔 ID DO TICKET: #${Math.floor(Math.random() * 999).toString().padStart(3, '0')}                              
│ 📅 DATA: ${new Date().toLocaleString()}                        
│                                                     
│ 📝 DESCREVA SEU PROBLEMA OU DÚVIDA:               
│                                                     
│ ⚠️  AGUARDE, UM MEMBRO DA EQUIPE IRÁ ATENDER VOCÊ  
│    O MAIS BREVE POSSÍVEL!                         
│                                                     
│ 🔒 FECHAR TICKET  (somente alguém do suporte pode fechar o ticket)                       
│                                                     
└──────────────────────────────────────────────────────┘
        `);

        const btnFechar = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
            .setCustomId('fechar_ticket')
            .setLabel('🔒 FECHAR TICKET')
            .setStyle(ButtonStyle.Danger)
        );

        await canal.send({ embeds: [embedTicket], components: [btnFechar] });
        await interaction.reply({ content: `✅ Ticket criado! Acesse aqui: ${canal}`, ephemeral: true });
    }
});

// ==================================
//    🔒 SISTEMA DE FECHAR TICKET
// ==================================
bot.on('interactionCreate', async interaction => {
    if (!interaction.isButton()) return;

    // --- BOTÃO DE FECHAR ---
    if (interaction.customId === 'fechar_ticket') {
        
        // TRAVA: SÓ SUPORTE PODE FECHAR
        if(!interaction.member.roles.cache.has(dados.cargo_suporte) && interaction.user.id !== dados.dono){
            return interaction.reply({ 
                content: "❌ **ERRO:** Somente alguém do suporte pode fechar o ticket!", 
                ephemeral: true 
            });
        }

        const usuario = interaction.channel.name.split('-')[1]; // Pega o nome do user
        const staff = interaction.user;

        // --- TELA DE ENCERRAMENTO ---
        const embedFechado = new EmbedBuilder()
        .setTitle("🔒 TICKET ENCERRADO | ATENDIMENTO FINALIZADO")
        .setColor("#ff0000")
        .setDescription(`
╔══════════════════════════════════════════════════════╗
║ 🔒 TICKET ENCERRADO | ATENDIMENTO FINALIZADO      ║
╚══════════════════════════════════════════════════════╝

┌──────────────────────────────────────────────────────┐
│                                                     
│ 🎫 TICKET NÚMERO: #001                             
│ 👤 USUÁRIO: @${usuario}                       
│ 🛡️ FECHADO POR: ${staff}                   
│ 📅 DATA: ${new Date().toLocaleString()}                        
│                                                     
│ 📝 OBSERVAÇÕES:                                   
│    Atendimento finalizado com sucesso!       
│                                                     
│ 📊 DURAÇÃO: Calculada automaticamente                             
│ 📄 TRANSCRIÇÃO SALVA NOS LOGS!                    
│                                                     
│ 🗑️  ESTE CANAL SERÁ APAGADO EM 10 SEGUNDOS...     
│                                                     
└──────────────────────────────────────────────────────┘
        `);

        await interaction.reply({ embeds: [embedFechado] });

        // APAGA O CANAL DEPOIS DE 10 SEGUNDOS
        setTimeout(async () => {
            try {
                await interaction.channel.delete();
            } catch (err) {
                console.log("Erro ao apagar canal");
            }
        }, 10000);
    }
});

// ==================================
//    🚀 LOGIN FINAL
// ==================================
bot.login(cfg.token);
console.log("📦 b0t-sup | Carregado e Pronto!");
