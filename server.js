const express = require('express');
const session = require("express-session");
const bodyParser = require('body-parser');
const bcrypt = require("bcrypt");
const db = require('better-sqlite3')('boxcad.db', {});
const path = require("path");
const config = require("./config.json");
const { Webhook } = require("discord-webhook-node");
var discord;
if(config.webhookEnabled) {
    discord = new Webhook('https://canary.discord.com/api/webhooks/1031789595622391830/bD1nQzMy0irwh5hPe86LEog-AHPzGkeRSefSuufczVJcoDXU8IKwDpkpVW3YrOr7GGMJ');
}
const { escape } = require('querystring');
var app = express()

app.set('views', path.join(__dirname, "public"))
app.use(bodyParser.urlencoded({ extended: false }));
app.set("view engine", "ejs")
app.use(session({
    secret: 'ChangeThisToAnythingRandomLike%#@BQ%#$WF',
    resave: false,
    saveUninitialized: false,
    cookie: { secure: false }
}))


app.use('/src', express.static('src'));

app.get("/", async function(req, res) {
    if(!req.session.authed) { res.redirect("/login"); return; }
    res.render("dashboard", {
        user: req.session.user,
        authed: req.session.authed,
        config: config
    })
})
app.get("/dashboard", async function(req, res) {
    if(!req.session.authed) { res.redirect("/login"); return; }
    res.render("dashboard", {
        user: req.session.user,
        authed: req.session.authed,
        config: config
    })
})
app.get("/login", async function(req, res) {
    if(req.session.authed) { res.redirect("/dashboard"); return; }
    res.render("login", {
        config: config
    })
})
app.get("/logout", function(req, res){
    req.session.destroy();
    res.redirect("/login");
})

app.post("/login", function(req, res){
    var email = req.body.email;
    var password = escape(req.body.password);
    var user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
    if(!user) { 
        res.render("login", {
            config: config,
            error: "Incorrect password."
        })
        return;
    }
    var savedHash = user["password"];
    var correctPassword = bcrypt.compareSync(escape(password), savedHash);
    if(!correctPassword) {
        discord.error("Incorrect Password Login", "User", user["name"], true)
        res.render("login", {
            config: config,
            error: "Incorrect password."
        })
        return;
    }
    if(config.webhookEnabled) {
        discord.info("Successful Login", "User", user["name"], false);
    }
    req.session.user = user;
    req.session.authed = true;
    res.redirect("/dashboard")
});

app.get("/users/:id", (req, res) => {
    var user = db.prepare("SELECT * FROM users WHERE rowid = ?").get(req.params.id);
    if(user == null) { return res.send({}) }
    user.id = req.params.id;
    user.password = "Hidden";
    res.send(user);
})

app.get("/favicon.ico", function(req, res){
    res.sendFile(path.join(__dirname + "/favicon.ico"));
})
// Catch any non-existent pages
app.get("*", async function(req, res) {
    res.send("<html> <h1> Unknown page. </h1> </html>");
})

app.listen(80)