const { Client, GatewayIntentBits, EmbedBuilder, PermissionsBitField } = require('discord.js');
const fs = require('fs');
const express = require('express');

// ==================================
//        CONFIGURAÇÕES
// ==================================
const client = new Client({ 
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildModeration
    ]
});

// 🔗 CONEXÃO
const LINK_DA_LOJINHA = "COLOQUE_SEU_LINK_AQUI";
const TOKEN = "COLOQUE_SEU_TOKEN_AQUI";

// ==================================
//        BANCO DE DADOS
// ==================================
let dados = {
    ativado: false,
    dono: "",
    expiracao: "",
    antiraid: false,
    antispam: false,
    canal_logs: "",
    cargos_ban: [],
    cargos_kick: []
};

if(fs.existsSync('./dados.json')){
    dados = JSON.parse(fs.readFileSync('./dados.json'));
}

function salvarDados(){
    fs.writeFileSync('./dados.json', JSON.stringify(dados, null, 2));
}

// ==================================
//        EVENTO DE PRONTO
// ==================================
client.on('ready', () => {
    console.log(`✅ Logado como ${client.user.tag}`);
    console.log(`🛡️ Sistema de Segurança Pronto!`);
    client.user.setActivity(`Protegendo o Servidor`, { type: 'PLAYING' });
});

// ==================================
//        SISTEMA DE ATIVAÇÃO
// ==================================
client.on('messageCreate', async message => {
    if(message.author.bot) return;

    // COMANDO DE ATIVAR
    if(message.content.startsWith('!ativar')){
        const key = message.content.split(' ')[1];

        if(!key){
            return message.reply("❌ Coloque a chave! Ex: `!ativar key123`");
        }

        try {
            const resp = await fetch(`${LINK_DA_LOJINHA}/verificar?key=${key}`);
            const res = await resp.json();

            if(!res.valido){
                return message.reply(`❌ Chave Invalida! ${res.motivo}`);
            }

            dados.ativado = true;
            dados.dono = message.author.id;
            dados.expiracao = res.expira_em;
            salvarDados();

            await fetch(`${LINK_DA_LOJINHA}/usar?key=${key}&user=${message.author.id}`);

            message.reply({
                embeds: [
                    new EmbedBuilder()
                    .setColor("Green")
                    .setTitle("✅ SISTEMA ATIVADO!")
                    .setDescription("Sistema de Segurança Liberado!")
                    .addFields(
                        { name: '📦 Produto', value: res.produto },
                        { name: '⏳ Válido até', value: res.expira_em }
                    )
                ]
            });

        } catch (err) {
            message.reply("❌ Erro ao conectar com a Lojinha!");
        }
    }

    // ==================================
    //        COMANDOS DE CONFIG
    // ==================================
    if(!dados.ativado || message.author.id !== dados.dono) return;

    // DEFINIR CANAL DE LOGS
    if(message.content.startsWith('!setlog')){
        const canal = message.mentions.channels.first();
        if(!canal){
            return message.reply("❌ Mencione um canal! Ex: `!setlog #logs`");
        }

        dados.canal_logs = canal.id;
        salvarDados();
        message.reply(`✅ Canal de logs definido para ${canal}`);
    }

    // LIGAR ANTI-RAID
    if(message.content === '!antiraid on'){
        dados.antiraid = true;
        salvarDados();
        message.reply("🛡️ **ANTI-RAID LIGADO!** Ninguém pode entrar em massa!");
    }

    if(message.content === '!antiraid off'){
        dados.antiraid = false;
        salvarDados();
        message.reply("🛡️ **ANTI-RAID DESLIGADO!**");
    }

    // LIGAR ANTI-SPAM
    if(message.content === '!antispam on'){
        dados.antispam = true;
        salvarDados();
        message.reply("🚫 **ANTI-SPAM LIGADO!** Mensagens repetidas serão bloqueadas!");
    }

    if(message.content === '!antispam off'){
        dados.antispam = false;
        salvarDados();
        message.reply("🚫 **ANTI-SPAM DESLIGADO!**");
    }
});

// ==================================
//        SERVINDO NO RAILWAY
// ==================================
const app = express();
app.get('/', (req, res) => res.send('✅ Bot de Segurança ON!'));
app.listen(3000, () => console.log('🚀 Rodando na porta 3000'));

// ==================================
//        SISTEMA DE LOGS
// ==================================
client.on('guildMemberAdd', async membro => {
    if(!dados.canal_logs) return;
    const canal = client.channels.cache.get(dados.canal_logs);
    if(!canal) return;

    const embed = new EmbedBuilder()
    .setColor("Blue")
    .setTitle("👋 NOVO MEMBRO")
    .setDescription(`${membro.user.tag} entrou no servidor!`)
    .setThumbnail(membro.user.displayAvatarURL({ dynamic: true }))
    .setTimestamp();

    canal.send({ embeds: [embed] });
});

client.on('guildMemberRemove', async membro => {
    if(!dados.canal_logs) return;
    const canal = client.channels.cache.get(dados.canal_logs);
    if(!canal) return;

    const embed = new EmbedBuilder()
    .setColor("Red")
    .setTitle("🚪 MEMBRO SAIU")
    .setDescription(`${membro.user.tag} saiu do servidor!`)
    .setThumbnail(membro.user.displayAvatarURL({ dynamic: true }))
    .setTimestamp();

    canal.send({ embeds: [embed] });
});

// ==================================
//        SISTEMA ANTI-SPAM
// ==================================
const usuariosSpam = new Map();

client.on('messageCreate', async message => {
    if(message.author.bot) return;
    if(!dados.antispam) return;
    if(message.member.permissions.has(PermissionsBitField.Flags.Administrator)) return;

    const userId = message.author.id;
    
    if(!usuariosSpam.has(userId)){
        usuariosSpam.set(userId, { contador: 1, ultimaMsg: Date.now() });
    } else {
        const dadosUser = usuariosSpam.get(userId);
        const tempoPassado = Date.now() - dadosUser.ultimaMsg;

        if(tempoPassado < 2000){ // Menos de 2 segundos
            dadosUser.contador++;
        } else {
            dadosUser.contador = 1;
        }

        dadosUser.ultimaMsg = Date.now();
        usuariosSpam.set(userId, dadosUser);

        // SE CHEGAR A 5 MENSAGENS RÁPIDAS
        if(dadosUser.contador >= 5){
            await message.delete().catch(() => {});
            
            const embed = new EmbedBuilder()
            .setColor("Yellow")
            .setTitle("🚫 ANTI-SPAM")
            .setDescription(`${message.author} foi avisado por flood!`);

            message.channel.send({ embeds: [embed] }).then(msg => setTimeout(() => msg.delete(), 5000));

            dadosUser.contador = 0;

            // SE CONTINUAR, BANE
            if(dadosUser.contador >= 10){
                await message.member.ban({ reason: "Spam excessivo" }).catch(() => {});
            }
        }
    }

    // LIMPA O MAP DEPOIS DE 10 SEGUNDOS
    setTimeout(() => {
        if(usuariosSpam.has(userId)){
            usuariosSpam.delete(userId);
        }
    }, 10000);
});

// ==================================
//        SISTEMA ANTI-RAID
// ==================================
const entradasRecentes = new Map();

client.on('guildMemberAdd', async membro => {
    if(!dados.antiraid) return;

    const servidorId = membro.guild.id;
    
    if(!entradasRecentes.has(servidorId)){
        entradasRecentes.set(servidorId, { contador: 1, tempo: Date.now() });
    } else {
        const dadosServ = entradasRecentes.get(servidorId);
        const tempoPassado = Date.now() - dadosServ.tempo;

        if(tempoPassado < 10000){ // Menos de 10 segundos
            dadosServ.contador++;
        } else {
            dadosServ.contador = 1;
            dadosServ.tempo = Date.now();
        }

        entradasRecentes.set(servidorId, dadosServ);

        // SE MAIS DE 10 PESSOAS ENTRAREM RÁPIDO
        if(dadosServ.contador > 10){
            // BANE O NOVO
            await membro.ban({ reason: "Anti-Raid ativado" }).catch(() => {});
            
            // AVISA NO LOG
            if(dados.canal_logs){
                const canal = client.channels.cache.get(dados.canal_logs);
                if(canal){
                    const embed = new EmbedBuilder()
                    .setColor("DarkRed")
                    .setTitle("⚠️ ALERTA DE RAID!")
                    .setDescription(`Muitas entradas rápidas! ${membro.user.tag} foi banido automaticamente.`)
                    .setTimestamp();

                    canal.send({ embeds: [embed] });
                }
            }
        }
    }
});

// ==================================
//        LOGAR O BOT
// ==================================
client.login(TOKEN);
                                                                             
