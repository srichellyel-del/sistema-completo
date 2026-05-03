const { Client, GatewayIntentBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ModalBuilder, TextInputBuilder, TextInputStyle } = require('discord.js');
const fs = require('fs');
const express = require('express');

// ==================================
//        CONFIGURAÇÕES GERAIS
// ==================================
const client = new Client({ 
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.DirectMessages
    ]
});

// SUA KEY MESTRE
const KEY_MESTRE = "coelho09@09";

// COLOQUE O TOKEN DO SEU BOT AQUI
token: process.env.DISCORD_TOKEN

// ==================================
//        BANCO DE DADOS
// ==================================
let dados = {
    produtos: [],
    chaves: [],
    pix: "SUA_CHAVE_PIX_AQUI",
    webhook: ""
};

// Cria pasta se não existir
if (!fs.existsSync('./configs')){
    fs.mkdirSync('./configs');
}

// Carrega dados
if(fs.existsSync('./configs/dados.json')){
    dados = JSON.parse(fs.readFileSync('./configs/dados.json'));
}

// Salva dados
function salvarDados(){
    fs.writeFileSync('./configs/dados.json', JSON.stringify(dados, null, 2));
}

// ==================================
//        EVENTO DE PRONTO
// ==================================
client.on('ready', () => {
    console.log(`✅ Logado como ${client.user.tag}`);
    console.log(`🔑 Sistema da Lojinha Rodando Perfeitamente!`);
    client.user.setActivity(`Sistema de Vendas | ${KEY_MESTRE}`, { type: 'PLAYING' });
});

// ==================================
//        SISTEMA DE LOGIN / KEY
// ==================================
client.on('messageCreate', async message => {
    if(message.author.bot) return;

    // VERIFICA SE É A KEY MESTRE
    if(message.content === KEY_MESTRE){
        message.reply({
            embeds: [
                new EmbedBuilder()
                .setColor("Green")
                .setTitle("👑 KEY MESTRE RECONHECIDA!")
                .setDescription("Bem vindo Dono! Acessando painel principal...")
            ]
        });
        
        // AQUI VAI ABRIR O PAINEL DEPOIS
        // Por enquanto só avisa que entrou
    }
});

// ==================================
//        SERVINDO NO RAILWAY
// ==================================
const app = express();
app.get('/', (req, res) => res.send('✅ Sistema da Lojinha ON e Funcionando!'));
app.listen(3000, () => console.log('🚀 Servidor Rodando na porta 3000'));

// ==================================
//        LOGAR O BOT
// ==================================
client.login(TOKEN);

// ==================================
//        FUNÇÃO DO PAINEL
// ==================================
function abrirPainelPrincipal(message){
    const embed = new EmbedBuilder()
    .setColor("Blue")
    .setTitle("🛍️ PAINEL DA LOJINHA")
    .setDescription("Olá Dono! Selecione abaixo o que deseja gerenciar:")
    .setThumbnail(client.user.displayAvatarURL())
    .addFields(
        { name: '📦 Produtos', value: 'Crie e gerencie os produtos', inline: true },
        { name: '🔑 Chaves', value: 'Gere e veja chaves', inline: true },
        { name: '⚙️ Configs', value: 'Altere PIX e Webhook', inline: true }
    )
    .setFooter({ text: 'Sistema Seguro | 2026' });

    const botoes = new ActionRowBuilder()
    .addComponents(
        new ButtonBuilder()
        .setCustomId('btn_produtos')
        .setLabel('📦 GERENCIAR PRODUTOS')
        .setStyle(ButtonStyle.Primary),

        new ButtonBuilder()
        .setCustomId('btn_chaves')
        .setLabel('🔑 GERAR CHAVES')
        .setStyle(ButtonStyle.Success),

        new ButtonBuilder()
        .setCustomId('btn_configs')
        .setLabel('⚙️ CONFIGURAÇÕES')
        .setStyle(ButtonStyle.Secondary)
    );

    message.channel.send({ embeds: [embed], components: [botoes] });
}

// ==================================
//        CLIQUE NOS BOTÕES
// ==================================
client.on('interactionCreate', async interaction => {
    if (!interaction.isButton()) return;

    // BOTÃO PRODUTOS
    if(interaction.customId === 'btn_produtos'){
        await interaction.update({
            embeds: [
                new EmbedBuilder()
                .setColor("NotQuiteBlack")
                .setTitle("📦 MENU DE PRODUTOS")
                .setDescription("Escolha uma ação:")
                .addFields(
                    { name: '➕ Criar Produto', value: 'Cria novos itens para venda' },
                    { name: '📋 Ver Produtos', value: 'Lista todos os produtos' }
                )
            ],
            components: [
                new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                    .setCustomId('criar_produto')
                    .setLabel('➕ CRIAR')
                    .setStyle(ButtonStyle.Success),

                    new ButtonBuilder()
                    .setCustomId('voltar')
                    .setLabel('🔙 VOLTAR')
                    .setStyle(ButtonStyle.Danger)
                )
            ]
        });
    }

    // BOTÃO VOLTAR
    if(interaction.customId === 'voltar'){
        abrirPainelPrincipal(interaction);
    }
});

// ==================================
//        ATUALIZA O LOGIN PARA CHAMAR O PAINEL
// ==================================
// VAI LA EM CIMA NO "messageCreate" E TROCA A LINHA:
// // ABRE O PAINEL PRINCIPAL
// POR ISSO:
abrirPainelPrincipal(message);

// ==================================
//        SISTEMA DE CRIAR PRODUTO
// ==================================
client.on('interactionCreate', async interaction => {
    if (!interaction.isButton()) return;

    // QUANDO CLICA EM CRIAR PRODUTO
    if(interaction.customId === 'criar_produto'){

        const modal = new ModalBuilder()
        .setCustomId('modal_criar_produto')
        .setTitle('➕ NOVO PRODUTO');

        const nomeInput = new TextInputBuilder()
        .setCustomId('nome_produto')
        .setLabel("Nome do Produto")
        .setStyle(TextInputStyle.Short)
        .setPlaceholder("Ex: Bot de Segurança, 100 Membros...")
        .setRequired(true);

        const precosInput = new TextInputBuilder()
        .setCustomId('precos_produto')
        .setLabel("Valores (Separar por ,)")
        .setStyle(TextInputStyle.Paragraph)
        .setPlaceholder("Ex: 30 dias - R$10, 60 dias - R$15")
        .setRequired(true);

        const primeiraLinha = new ActionRowBuilder().addComponents(nomeInput);
        const segundaLinha = new ActionRowBuilder().addComponents(precosInput);

        modal.addComponents(primeiraLinha, segundaLinha);

        await interaction.showModal(modal);
    }
});

// ==================================
//        RECEBER DADOS DO MODAL
// ==================================
client.on('interactionCreate', async interaction => {
    if (!interaction.isModalSubmit()) return;

    if(interaction.customId === 'modal_criar_produto'){
        const nome = interaction.fields.getTextInputValue('nome_produto');
        const precos = interaction.fields.getTextInputValue('precos_produto');

        // ADICIONA NO BANCO DE DADOS
        dados.produtos.push({
            nome: nome,
            opcoes: precos
        });

        salvarDados();

        interaction.reply({
            embeds: [
                new EmbedBuilder()
                .setColor("Green")
                .setTitle("✅ PRODUTO CRIADO!")
                .setDescription(`Produto: **${nome}** foi adicionado a loja!`)
            ],
            ephemeral: true
        });
    }
});

// ==================================
//        SISTEMA DE GERAR CHAVES
// ==================================
client.on('interactionCreate', async interaction => {
    if (!interaction.isButton()) return;

    // BOTÃO GERAR CHAVES
    if(interaction.customId === 'btn_chaves'){

        // Pega a lista de produtos para escolher
        let botoesProdutos = [];

        dados.produtos.forEach((prod, index) => {
            botoesProdutos.push(
                new ButtonBuilder()
                .setCustomId(`gerar_${index}`)
                .setLabel(`📦 ${prod.nome}`)
                .setStyle(ButtonStyle.Primary)
            );
        });

        // Divide em linhas se for muitos produtos
        const linhas = [];
        while(botoesProdutos.length > 0){
            linhas.push(new ActionRowBuilder().addComponents(botoesProdutos.splice(0, 5)));
        }

        await interaction.update({
            embeds: [
                new EmbedBuilder()
                .setColor("Gold")
                .setTitle("🔑 GERAR CHAVES")
                .setDescription("Clique no produto que deseja criar a chave:")
            ],
            components: linhas
        });
    }

    // QUANDO CLICA NO PRODUTO
    if(interaction.customId.startsWith('gerar_')){
        const id = interaction.customId.split('_')[1];
        const produto = dados.produtos[id];

        // CRIA A CHAVE NO FORMATO PEDIDO
        const nomeLimpo = produto.nome.toLowerCase().replace(/ /g, '-');
        const numero = Math.floor(Math.random() * 999).toString().padStart(3, '0');
        const aleatorio = Math.random().toString(36).substring(2, 8);
        
        const chave = `key${nomeLimpo}-${numero}-${aleatorio}`;

        // DATA DE EXPIRAÇÃO (30 DIAS)
        const dataExpira = new Date();
        dataExpira.setDate(dataExpira.getDate() + 30);

        // SALVA NO BANCO
        dados.chaves.push({
            key: chave,
            produto: produto.nome,
            criada_em: new Date().toLocaleDateString(),
            expira_em: dataExpira.toLocaleDateString(),
            status: "DISPONIVEL"
        });

        salvarDados();

        // MOSTRA A CHAVE
        await interaction.update({
            embeds: [
                new EmbedBuilder()
                .setColor("Green")
                .setTitle("✅ CHAVE GERADA COM SUCESSO!")
                .addFields(
                    { name: '📦 Produto', value: produto.nome },
                    { name: '🔑 Chave', value: `\`${chave}\`` },
                    { name: '⏳ Validade', value: '30 Dias' }
                )
            ],
            components: []
        });
    }
});

// ==================================
//        SISTEMA DE CONEXÃO API
// ==================================
// ISSO É O QUE OS OUTROS BOTS VÃO USAR!

app.get('/verificar', (req, res) => {
    const key = req.query.key; // Pega a chave que o outro bot mandou

    if(!key){
        return res.json({ valido: false, motivo: "Chave não informada" });
    }

    // PROCURA A CHAVE NO BANCO DE DADOS
    const chaveEncontrada = dados.chaves.find(k => k.key === key);

    if(!chaveEncontrada){
        return res.json({ valido: false, motivo: "Chave não existe" });
    }

    // VERIFICA SE JÁ FOI USADA
    if(chaveEncontrada.status === "USADA"){
        return res.json({ valido: false, motivo: "Chave já foi utilizada" });
    }

    // VERIFICA DATA DE EXPIRAÇÃO
    const hoje = new Date();
    const dataExp = new Date(chaveEncontrada.expira_em);

    if(hoje > dataExp){
        chaveEncontrada.status = "EXPIRADA";
        salvarDados();
        return res.json({ valido: false, motivo: "Chave Expirada" });
    }

    // SE CHEGOU AQUI, ESTÁ TUDO CERTO!
    return res.json({
        valido: true,
        produto: chaveEncontrada.produto,
        expira_em: chaveEncontrada.expira_em,
        dono: chaveEncontrada.dono || "Novo"
    });
});

// ==================================
//        ROTA PARA MARCAR COMO USADA
// ==================================
app.get('/usar', (req, res) => {
    const key = req.query.key;
    const user = req.query.user || "Desconhecido";

    const chaveEncontrada = dados.chaves.find(k => k.key === key);

    if(chaveEncontrada && chaveEncontrada.status === "DISPONIVEL"){
        chaveEncontrada.status = "USADA";
        chaveEncontrada.dono = user;
        salvarDados();
        return res.json({ ok: true });
    }

    return res.json({ ok: false });
});
