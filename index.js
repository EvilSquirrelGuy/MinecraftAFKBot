const Discord = require("discord.js")
const mineflayer = require("mineflayer")
const config = require("./config.json")
const fs = require("fs")

//const server = require("./webserver.js") // ignore this
//server.start()

let intentionalDisconnect = false // tracks difference between kick and asked disconnect, kinda obsolete
// DISCORD BOT FOR MANAGEMENT

const token = process.env["TOKEN"]

const client = new Discord.Client({
  intents: [
		Discord.GatewayIntentBits.Guilds,
		Discord.GatewayIntentBits.GuildMessages,
		Discord.GatewayIntentBits.MessageContent,
		Discord.GatewayIntentBits.GuildMembers,
        Discord.GatewayIntentBits.GuildPresences
	]
})

let channel = config.discord.channel

console.info = function(message) {
  channel.send(message)
}

const botOptions = {
    username: config.auth.email,
    auth: "microsoft",
    host: config.minecraft.server.host,
    port: config.minecraft.server.port,
    verbose: true
  }

let bot = mineflayer.createBot(botOptions)

// ON READY
client.on("ready", () => {
  console.log(`Logged in as ${client.user.tag}!`)
  channel = client.channels.cache.get(config.discord.channel)

  client.user.setPresence({
    activities: [{
      name: 'Waterfall Nations',
      type: 3
    }],
    status: 'dnd'
  })
})

function commandFeedback(discordMsg, msg) {
  if (discordMsg) {
    discordMsg.reply(msg)
  } else {
    channel.send(msg)
  }
}

function parseCommand(cmd, msg, username) {
  parsed = cmd.substring(1).split(" ")
  if (parsed[0] == "leave" || parsed[0] == "quit" || parsed[0] == "q"){
    intentionalDisconnect = true
    bot.quit()
    commandFeedback(msg, `Bot disconnected by ${username}.`)
  }
  if (username === config.minecraft.controller || msg) {
    if (parsed[0] == "tpa") {
        let player = parsed[1]
        if (!player) player = config.minecraft.controller
        bot.chat(`/tpa ${player}`)
        commandFeedback(msg, `Teleportation to ${player} requested.`)

      } else if (parsed[0] == "leave" || parsed[0] == "quit" || parsed[0] == "q") {
        intentionalDisconnect = true
        bot.quit()
        commandFeedback(msg, "Bot disconnected.")

      } else if (parsed[0] == "tpaccept") {
        bot.chat("/tpaccept")
        commandFeedback(msg, "Accepted teleport request.")

      } else if (parsed[0] == "sethome" || parsed[0] == "sh") {
        let homeName = parsed[1]
        if (!homeName) homeName = "default"
        bot.chat(`/removehome ${homeName}`)
        bot.chat(`/sethome ${homeName}`)
        commandFeedback(msg, `(Re-)Set home with name ${homeName}.`)

      } else if (parsed[0] == "home" || parsed[0] == "h") {
        let homeName = parsed[1]
        if (!homeName) homeName = "default"
        bot.chat(`/home ${homeName}`)
        commandFeedback(msg, `Teleported bot to home with name ${homeName}.`)

      } else if (parsed[0] == "removehome" || parsed[0] == "rh") {
        let homeName = parsed[1]
        if (!homeName) homeName = "default"
        bot.chat(`/removehome ${homeName}`)
        commandFeedback(msg, `Removed home with name ${homeName}.`)

      } else if (parsed[0] == "reconnect" || parsed[0] == "rc") {
        bot = mineflayer.createBot(botOptions)
        bindEvents(bot)
        commandFeedback(msg, "Connecting bot back to server.")
      }
  }
}

function bindEvents(bot) {

  bot.on("chat", (username, message) => {
    if (message.startsWith("me] ")) {
      content = message.substr(4)
      if (content.startsWith("?")) {
        parseCommand(content, null, username)
      }
    }
  })

  bot.on('kick', (kickMsg) => {
    channel.send(`Bot kicked for ${kickMsg}.`)
    if (kickMsg.toLowerCase().includes("kicked")) {
      intentionalDisconnect = true
    }
  })

  bot.on('end', (reason) => {
    channel.send(`Bot disconnected due to ${reason}.`)
    if (reason == "socketClosed" && !intentionalDisconnect) {
      channel.send("Will attempt to reconnect after 120s")
      if (!bot) setTimeout(() => {
        bot = mineflayer.createBot(botOptions)
        bindEvents(bot)
        channel.send("Reconnecting bot")
      }, 120000)
    } else {
      intentionalDisconnect = false
    }
  })

  bot.on('error', (e) => {
    channel.send("Error: " + e)
  })

}


client.on("messageCreate", (message) => {
  if (message.channel.id !== channel.id) return //if not in the specified channel
  if (message.author.id === client.user.id) return //ignore messages from the bot
  if (message.content.startsWith("?")) {
    parseCommand(message.content, message, null)
  }
})

bindEvents(bot)

client.on("debug", console.log)

client.login(token).catch(console.error)

// END DISCORD BOT
