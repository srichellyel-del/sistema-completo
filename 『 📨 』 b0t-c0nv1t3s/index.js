const { Client, GatewayIntentBits, EmbedBuilder } = require('discord.js');
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
        GatewayIntentBits.GuildMembers
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
    link_convite: "",
    rodando: false
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
    console.log(`📨 Sistema de Convites Pronto!`);
    client.user.setActivity(`Enviando Convites...`, { type: 'PLAYING' });
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
            return message.reply("❌ Você precisa colocar uma chave! Ex: `!ativar key123`");
        }

        // VERIFICA NA LOJINHA
        try {
            const resposta = await fetch(`${LINK_DA_LOJINHA}/verificar?key=${key}`);
            const resultado = await resposta.json();

            if(!resultado.valido){
                return message.reply(`❌ Chave Inválida! Motivo: ${resultado.motivo}`);
            }

            // ATIVA O SISTEMA
            dados.ativado = true;
            dados.dono = message.author.id;
            dados.expiracao = resultado.expira_em;
            salvarDados();

            // AVISA A LOJINHA QUE FOI USADA
            await fetch(`${LINK_DA_LOJINHA}/usar?key=${key}&user=${message.author.id}`);

            message.reply({
                embeds: [
                    new EmbedBuilder()
                    .setColor("Green")
                    .setTitle("✅ SISTEMA ATIVADO!")
                    .setDescription(`Obrigado por comprar!`)
                    .addFields(
                        { name: '📦 Produto', value: resultado.produto },
                        { name: '⏳ Válido até', value: resultado.expira_em }
                    )
                ]
            });

        } catch (erro){
            message.reply("❌ Erro ao conectar com a Lojinha!");
        }
    }

    // COMANDO PARA COLOCAR O LINK
    if(message.content.startsWith('!link') && dados.ativado && message.author.id === dados.dono){
        const link = message.content.split(' ')[1];
        dados.link_convite = link;
        salvarDados();
        message.reply(`✅ Link salvo! \n${link}`);
    }
});

// ==================================
//        SERVINDO NO RAILWAY
// ==================================
const app = express();
app.get('/', (req, res) => res.send('✅ Bot de Convites ON!'));
app.listen(3000, () => console.log('🚀 Servidor Rodando'));

// ==================================
//        LOGAR O BOT
// ==================================
client.login(TOKEN);

// ==================================
//        SISTEMA DE ENVIAR
// ==================================
client.on('messageCreate', async message => {
    if(message.author.bot) return;
    if(!dados.ativado || message.author.id !== dados.dono) return;

    // COMANDO INICIAR
    if(message.content === '!iniciar'){
        if(!dados.link_convite){
            return message.reply("❌ Coloque o link primeiro com `!link`");
        }

        dados.rodando = true;
        salvarDados();

        message.reply("🚀 **INICIANDO SISTEMA DE DIVULGAÇÃO!**\nVou sair mandando convites aleatoriamente!");

        // INICIA O LOOP
        enviarConvitesLoop();
    }

    // COMANDO PARAR
    if(message.content === '!parar'){
        dados.rodando = false;
        salvarDados();
        message.reply("🛑 **SISTEMA PARADO!**");
    }
});

// ==================================
//        FUNÇÃO PRINCIPAL
// ==================================
async function enviarConvitesLoop(){
    while(dados.rodando){
        try {
            // PEGA TODOS OS SERVIDORES QUE O BOT ESTÁ
            const servidores = client.guilds.cache.values();
            
            let todosMembros = [];

            // PEGA TODOS OS MEMBROS DE TODOS OS SERVIDORES
            for(const servidor of servidores){
                const membros = await servidor.members.fetch();
                membros.forEach(membro => {
                    // NÃO ADICIONA VOCÊ E NEM BOTS
                    if(!membro.user.bot && membro.id !== client.user.id){
                        todosMembros.push(membro);
                    }
                });
            }

            if(todosMembros.length === 0){
                console.log("❌ Nenhuma pessoa encontrada");
                await sleep(10000); // Espera 10 seg
                continue;
            }

            // ESCOLHE UM ALEATORIAMENTE
            const sorteado = todosMembros[Math.floor(Math.random() * todosMembros.length)];

            // MANDA A MENSAGEM
            try {
                await sorteado.send(`🔹 **ENTRA NO MEU SERVIDOR!** 🔹\n\n${dados.link_convite}\n\n✨ **Vagas Limitadas!**`);
                console.log(`✅ Enviado para: ${sorteado.user.tag}`);
            } catch (err) {
                console.log(`❌ Não consegui mandar para ${sorteado.user.tag} (Fechou o PV)`);
            }

            // ESPERA TEMPO PARA NÃO TOMAR BAN (30 SEGUNDOS)
            await sleep(30000); 

        } catch(erro){
            console.log("Erro no sistema: " + erro);
            await sleep(5000);
        }
    }
}

// FUNÇÃO DE ESPERAR
function sleep(ms){
    return new Promise(resolve => setTimeout(resolve, ms));
}
