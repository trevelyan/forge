const GameTemplate = require('../../lib/templates/gametemplate');
const saito = require('../../lib/saito/saito');


//////////////////
// CONSTRUCTOR  //
//////////////////
class Forge extends GameTemplate {

  constructor(app) {

    super(app);

    this.app = app;
    this.gamename = "Forge";
    this.appname = "Forge";
    this.name = "Forge";
    this.description = "Open source enchantment battle game";
    this.categories = "Games Arcade Entertainment";
    this.type            = "Cardgame";
    this.card_img_dir = '/forge/img/cards';

    // graphics
    this.interface = 1;

    this.minPlayers = 2;
    this.maxPlayers = 2;

    return this;

  }




  //
  // manually announce arcade banner support
  //
  respondTo(type) {

    if (super.respondTo(type) != null) {
      return super.respondTo(type);
    }

    // barge haulers on the volga
    if (type == "arcade-carousel") {
      let obj = {};
      obj.background = "/forge/img/arcade/arcade-banner-background.png";
      obj.title = "Forge";
      return obj;
    }
    
    if (type == "arcade-create-game") {
      return {
        slug: this.slug,
        title: this.name,
        description: this.description,
        publisher_message: this.publisher_message,
        returnGameOptionsHTML: this.returnGameOptionsHTML.bind(this),
        minPlayers: this.minPlayers,
        maxPlayers: this.maxPlayers,
      }
    }
    return null;

  }
  



  initializeHTML(app) {

    super.initializeHTML(app);

    //
    // ADD CHAT
    //
    this.app.modules.respondTo("chat-manager").forEach(mod => {
      mod.respondTo('chat-manager').render(app, this);
      mod.respondTo('chat-manager').attachEvents(app, this);
    });

    //
    // ADD MENU
    //
    this.menu.addMenuOption({
      text : "Game",
      id : "game-game",
      class : "game-game",
      callback : function(app, game_mod) {
        game_mod.menu.showSubMenu("game-game");
      }
    });
    this.menu.addSubMenuOption("game-game", {
      text : "Log",
      id : "game-log",
      class : "game-log",
      callback : function(app, game_mod) {
        game_mod.menu.hideSubMenus();
        game_mod.log.toggleLog();
      }
    });
    this.menu.addSubMenuOption("game-game", {
      text : "Exit",
      id : "game-exit",
      class : "game-exit",
      callback : function(app, game_mod) {
        window.location.href = "/arcade";
      }
    });
    this.menu.addMenuIcon({
      text : '<i class="fa fa-window-maximize" aria-hidden="true"></i>',
      id : "game-menu-fullscreen",
      callback : function(app, game_mod) {
        game_mod.menu.hideSubMenus();
        app.browser.requestFullscreen();
      }
    });

    let main_menu_added = 0;
    let community_menu_added = 0;
    for (let i = 0; i < this.app.modules.mods.length; i++) {
      if (this.app.modules.mods[i].slug === "chat") {
        for (let ii = 0; ii < this.game.players.length; ii++) {
          if (this.game.players[ii] != this.app.wallet.returnPublicKey()) {

            // add main menu
            if (main_menu_added == 0) {
              this.menu.addMenuOption({
                text : "Chat",
                id : "game-chat",
                class : "game-chat",
                callback : function(app, game_mod) {
                  game_mod.menu.showSubMenu("game-chat");
                }
              })
              main_menu_added = 1;
            }
            if (community_menu_added == 0) {
              this.menu.addSubMenuOption("game-chat", {
                text : "Community",
                id : "game-chat-community",
                class : "game-chat-community",
                callback : function(app, game_mod) {
                  game_mod.menu.hideSubMenus();
                  chatmod.mute_community_chat = 0;
                  chatmod.sendEvent('chat-render-request', {});
                  chatmod.openChatBox();
                }
              });
              community_menu_added = 1;
            }
            // add peer chat
            let data = {};
            let members = [this.game.players[ii], this.app.wallet.returnPublicKey()].sort();
            let gid = this.app.crypto.hash(members.join('_'));
            let name = "Player "+(ii+1);
            let chatmod = this.app.modules.mods[i];
            this.menu.addSubMenuOption("game-chat", {
              text : name,
              id : "game-chat-"+(ii+1),
              class : "game-chat-"+(ii+1),
              callback : function(app, game_mod) {
                game_mod.menu.hideSubMenus();
                chatmod.createChatGroup(members, name);
                chatmod.openChatBox(gid);
                chatmod.sendEvent('chat-render-request', {});
                chatmod.saveChat();
              }
            });
          }
        }
      }
    }

    this.menu.render(app, this);
    this.menu.attachEvents(app, this);

    this.log.render(app, this);
    this.log.attachEvents(app, this);

    this.cardbox.render(app, this);
    this.cardbox.attachEvents(app, this);

    //
    // add card events -- text shown and callback run if there
    //
    this.cardbox.addCardType("showcard", "", null);
    this.cardbox.addCardType("card", "select", this.cardbox_callback);

    this.hud.render(app, this);
    this.hud.attachEvents(app, this);

  }




  initializeGame(game_id) {

    //
    // initialize some useful variables
    //
    if (this.game.status != "") { this.updateStatus(this.game.status); }
    if (this.game.dice == "") { this.initializeDice(); }

    //
    // import player cards
    //
    let deck1 = this.returnWhiteDeck();
    let deck2 = this.returnBlueDeck();

    //
    // initialize queue on new games
    //
    if (this.game.deck.length == 0) {

      this.game.state = this.returnState(this.game.players.length);

      this.game.queue.push("round");
      this.game.queue.push("PLAY\t2");
      this.game.queue.push("PLAY\t1");
      this.game.queue.push("READY");

      this.game.queue.push("DEAL\t1\t1\t7");
      this.game.queue.push("DEAL\t2\t2\t7");

      // encrypt and shuffle player-2 deck
      this.game.queue.push("DECKENCRYPT\t2\t2");
      this.game.queue.push("DECKENCRYPT\t2\t1");
      this.game.queue.push("DECKXOR\t2\t2");
      this.game.queue.push("DECKXOR\t2\t1");

      // encrypt and shuffle player-1 deck
      this.game.queue.push("DECKENCRYPT\t1\t2");
      this.game.queue.push("DECKENCRYPT\t1\t1");
      this.game.queue.push("DECKXOR\t1\t2");
      this.game.queue.push("DECKXOR\t1\t1");

      // import our decks
      this.game.queue.push("DECK\t1\t" + JSON.stringify(deck1));
      this.game.queue.push("DECK\t2\t" + JSON.stringify(deck2));

    }

    //
    // dynamic import 
    //
    // all cards that may be in play are imported into this.game.cards. the import process
    // adds all necessary dummy functions and variables such that the game can check to see
    //
    // if cards implement special abilities, they must be individually programmed to do so 
    // when provided.
    //
    this.game.cards = {};
    for (let key in deck1) { this.importCard(key, deck1[key], 1); }   
    for (let key in deck2) { this.importCard(key, deck2[key], 2); }     

    try {
      this.displayBoard();
      this.updateStatusAndListCards("Waiting for Opponent Move", this.game.deck[this.game.player-1].hand);
    } catch (err) {

    }
  }


  handleGameLoop() {

    ///////////
    // QUEUE //
    ///////////
    if (this.game.queue.length > 0) {

      let qe = this.game.queue.length - 1;
      let mv = this.game.queue[qe].split("\t");
      let shd_continue = 1;

console.log("QUEUE: " + JSON.stringify(this.game.queue));

      //
      // we never clear the "round" so that when we hit it
      // we always bounce back higher on the queue by adding
      // turns for each player.
      //
      if (mv[0] == "round") {
	this.game.queue.push("PLAY\t2");
        this.game.queue.push("DEAL\t2\t2\t1");
	this.game.queue.push("PLAY\t1");
        this.game.queue.push("DEAL\t1\t1\t1");
      }

      if (mv[0] === "move") {

	let player_id = parseInt(mv[1]);
	let cardkey = mv[2];
	let source = mv[3];
	let destination = mv[4];
	let sending_player_also = 1;
	if (mv[5] == 0) { sending_player_also = 0; }

	if (sending_player_also == 0) {
	  if (this.game.player != player_id) {
	    this.moveCard(player_id, cardkey, source, destination);
	  }
	} else {
	  this.moveCard(player_id, cardkey, source, destination);
	}

	this.displayBoard();

        this.game.queue.splice(qe, 1);

      }

      if (mv[0] === "play") {

        let player_to_go = parseInt(mv[1]);

	//
	// update board
	//
        this.displayBoard();


	//
	// do not remove until we resolve!
	//
        //this.game.queue.splice(qe, 1);

        return 0;

      }


      //
      // avoid infinite loops
      //
      if (shd_continue == 0) {
        console.log("NOT CONTINUING");
        return 0;
      }

    }
    return 1;
  }





  nonPlayerTurn() {
    this.updateStatusAndListCards(`Opponent Turn`, this.game.deck[this.game.player-1].hand, function() {});
  }
  playerTurn() {

    if (this.browser_active == 0) { return; }

    //
    // show my hand
    //
    this.updateStatusAndListCards(`Your Turn <span id="end-turn" class="end-turn">[ or pass ]</span>`, this.game.deck[this.game.player-1].hand, function() {});

    //
    // players may click on cards in their hand
    //
    this.attachCardboxEvents((card) => {
      this.playerPlayCardFromHand(card);
    });

    //
    // players may also end their turn
    //
    document.getElementById("end-turn").onclick = (e) => {
      this.updateStatusAndListCards("Opponent Turn", this.game.deck[this.game.player-1].hand, function() {});
      this.prependMove("RESOLVE\t"+this.app.wallet.returnPublicKey());
      this.endTurn();
    }

    //
    // display board
    //
    this.displayBoard();

  }


  //
  // this moves a card from one location, such as a player's hand, to another, such as 
  // the discard or remove pile, or a location on the table, such as affixing it to 
  // another card.
  //
  moveCard(player, card, source, destination) {

console.log(player + " -- " + card + " -- " + source + " -- " + destination);

    switch(source) {

      case "hand":
        for (let i = 0; i < this.game.deck[0].hand.length; i++) {
	  if (this.game.deck[0].hand[i] == card) {
	    this.game.deck[0].hand.splice(i, 1);
	    break;
	  }
	}
        break;

      case "lands":
        for (let i = 0; i < this.game.state.hands[player-1].lands.length; i++) {
	  if (this.game.state.hands[player-1].lands[i] == card) {
	    this.game.state.hands[player-1].lands.splice(i, 1);
	    break;
	  }
	}
	break;

      case "creatures":
        for (let i = 0; i < this.game.state.hands[player-1].creatures.length; i++) {
	  if (this.game.state.hands[player-1].creatures[i] == card) {
	    this.game.state.hands[player-1].creatures.splice(i, 1);
	    break;
	  }
	}
	break;

      case "sorcery":
      case "enchantments":
        for (let i = 0; i < this.game.state.hands[player-1].enchantments.length; i++) {
	  if (this.game.state.hands[player-1].enchantments[i] == card) {
	    this.game.state.hands[player-1].enchantments.splice(i, 1);
	    break;
	  }
	}
	break;

      case "graveyard":
        for (let i = 0; i < this.game.state.hands[player-1].graveyard.length; i++) {
	  if (this.game.state.hands[player-1].graveyard[i] == card) {
	    this.game.state.hands[player-1].graveyard.splice(i, 1);
	    break;
	  }
	}
	break;

      default:
    }


console.log("pushing card onto " + destination);

    let already_exists = 0;
    switch(destination) {

      case "hand":
        already_exists = 0;
        for (let i = 0; i < this.game.deck[0].hand.length; i++) {
	  if (this.game.deck[0].hand[i] == card) {
	    already_exists = 1;
	  }
	}
	if (already_exists == 0) { 
	  this.game.deck[0].hand.push(card);
	}
        break;

      case "lands":
	already_exists = 0;
        for (let i = 0; i < this.game.state.hands[player-1].lands.length; i++) {
	  if (this.game.state.hands[player-1].lands[i] == card) {
	    already_exists = 1;
	  }
	}
	if (already_exists == 0) { 
	  this.game.state.hands[player-1].lands.push(card);
	}
	break;

      case "creatures":
	already_exists = 0;
        for (let i = 0; i < this.game.state.hands[player-1].creatures.length; i++) {
	  if (this.game.state.hands[player-1].creatures[i] == card) {
	    already_exists = 1;
	  }
	}
	if (already_exists == 0) { 
	  this.game.state.hands[player-1].creatures.push(card);
	}
	break;

      case "sorcery":
      case "enchantments":

	already_exists = 0;
        for (let i = 0; i < this.game.state.hands[player-1].enchantments.length; i++) {
	  if (this.game.state.hands[player-1].enchantments[i] == card) {
	    already_exists = 1;
	  }
	}
	if (already_exists == 0) { 
	  this.game.state.hands[player-1].enchantments.push(card);
	}
	break;

      case "graveyard":
	already_exists = 0;
        for (let i = 0; i < this.game.state.hands[player-1].graveyard.length; i++) {
	  if (this.game.state.hands[player-1].graveyard[i] == card) {
	    already_exists = 1;
	  }
	}
	if (already_exists == 0) { 
	  this.game.state.hands[player-1].graveyard.push(card);
	}
	break;

      default:
    }
  }

  playerPlayCardFromHand(card) {

    let c = this.game.cards[card];

    switch(c.type) {
      case "land":

	//
	// confirm player can place
	//
	if (this.game.state.has_placed_land == 1) {
	  alert("You may only play one land per turn.");
	  break;
	} else {
	  this.game.state.has_placed_land = 1;
	}

	// move land from hand to board
	this.moveCard(this.game.player, c.key, "hand", "lands");
	this.addMove("move\t"+this.game.player+"\t"+c.key+"\thand\tlands\t0");
	this.endTurn();
	break;

      case "creature":

	// move creature from hand to board
	this.moveCard(this.game.player, c.key, "hand", "creatures");
	this.addMove("move\t"+this.game.player+"\t"+c.key+"\thand\tcreatures\t0");
	this.endTurn();
	break;

      case "sorcery":
      case "enchantment":

	// move enchantment from hand to board
	this.moveCard(this.game.player, c.key, "hand", "enchantments");
	this.addMove("move\t"+this.game.player+"\t"+c.key+"\thand\tenchantments\t0");
	this.endTurn();
	break;

      case "instant" :

	// move instant from hand to board
	this.moveCard(this.game.player, c.key, "hand", "instant");
	this.addMove("move\t"+this.game.player+"\t"+c.key+"\thand\tinstants\t0");
	this.endTurn();
	break;

      default:
	console.log("unsupported card type");
    }
  }


  displayBoard() {

console.log("and displaying the board!");

    let game_self = this;

    // Player 1
    document.getElementById("p1-lands").innerHTML = "";
    document.getElementById("p1-creatures").innerHTML = "";
    document.getElementById("p1-enchantments").innerHTML = "";

    // Player 2
    document.getElementById("p2-lands").innerHTML = "";
    document.getElementById("p2-creatures").innerHTML = "";
    document.getElementById("p2-enchantments").innerHTML = "";

    for (let i = 1; i <= 2; i++) {
      for (let z = 0; z < this.game.state.hands[i-1].lands.length; z++) {
        this.app.browser.addElementToDom(this.game.cards[this.game.state.hands[i-1].lands[z]].returnElement(game_self, i), `p${i}-lands`);
      }  
      for (let z = 0; z < this.game.state.hands[i-1].creatures.length; z++) {
        this.app.browser.addElementToDom(this.game.cards[this.game.state.hands[i-1].creatures[z]].returnElement(game_self, i), `p${i}-creatures`);
      }  
      for (let z = 0; z < this.game.state.hands[i-1].enchantments.length; z++) {
console.log("enchantment: " + this.game.state.hands[i-1].enchantments[z]);
        this.app.browser.addElementToDom(this.game.cards[this.game.state.hands[i-1].enchantments[z]].returnElement(game_self, i), `p${i}-enchantments`);
      }  
    }

  }



  resetTurn() {

    this.game.state.turn = this.game.player;

    this.game.state.has_placed_land = 0;
    this.game.state.has_attacked = 0;

  }

  returnState(num_of_players) {

    let state = {};

    state.players = [num_of_players];
    for (let i = 0; i < num_of_players; i++) {
      state.players[i] = {};
      state.players[i].health = 20;
    }

    state.hands = [num_of_players];
    for (let i = 0; i < num_of_players; i++) {
      state.hands[i] = {};
      state.hands[i].cards = {};
      state.hands[i].lands = [];
      state.hands[i].creatures = [];
      state.hands[i].enchantments = [];
      state.hands[i].graveyard = [];
      state.hands[i].exhiled = [];
    }

    return state;

  }







  ////////////////////////////////
  /// Cards and Card Functions ///
  ////////////////////////////////
  returnBlueDeck() {

    var deck = {};

    deck['b001'] 	= {
	name: "b001"						, 
	type: "creature"					,
	color: "blue"						,
	cost: ['*','*','*','blue','blue']			,
	power: 4						,
	toughness: 3						,
	properties: ['flying']					,
	img: "/forge/img/cards/sample.png"
    }
    deck['b002'] 	= { 
	name: "b002"    					, 
	type: "creature"					,
	color: "blue"						,
	cost: ['*','*','blue']					,
	power: 2						,
	toughness: 1						,
	properties: ['flying']					,
	img: "/forge/img/cards/sample.png"			,
	onEnterBattlefield: function(game_self, player, card) {
	  game_self.updateLog("UNIMPLEMENTED: when creature enters battlefield, draw card.");
          return 1;
        }
    }
    deck['b003'] 	= { 
	name: "b003"    					, 
	type: "creature"					,
	color: "blue"						,
	cost: ['*','*','*','blue']				,
	power: 3						,
	toughness: 2						,
	properties: ['flying']					,
	img: "/forge/img/cards/sample.png"			,
	onAttack: function(game_self, player, card) {
	  game_self.updateLog("UNIMPLEMENTED: gains flying when attacking creatures without flying until end of turn.");
          return 1;
        }
    }
    deck['b004'] 	= { 
	name: "b004"    					, 
	type: "instant"						,
	color: "blue"						,
	cost: ['*','*','blue']					,
	img: "/forge/img/cards/sample.png"			,
	onInstant: function(game_self, player, card) {
	  game_self.updateLog("UNIMPLEMENTED: targetted creature gets -4/-0 until end of turn. Player may draw a card.");
	  return 1;
	}
    }
    deck['b005'] 		= { 
	name: "b005"    					, 
	type: "sorcery"						,
	color: "blue"						,
	cost: ['*','*','blue']					,
	img: "/forge/img/cards/sample.png"			,
	onCostAdjustment: function(game_self, player, card) {
	  game_self.updateLog("UNIMPLEMENTED: card costs 1 less to cast if player controlls creature with flying.");
	  return 1;
	}							,
	onInstant: function(game_self, player, card) {
	  game_self.updateLog("UNIMPLEMENTED: draw two cards");
	  return 1;
	}
    }
    deck['island1'] 		= { 
	name: "Isle"    					, 
	type: "land"						,
	color: "blue"						,
	img: "/forge/img/cards/sample.png"
    }
    deck['island2'] 		= { 
	name: "Isle"    					, 
	type: "land"						,
	color: "blue"						,
	img: "/forge/img/cards/sample.png"
    }
    deck['island3'] 		= { 
	name: "Isle"    					, 
	type: "land"						,
	color: "blue"						,
	img: "/forge/img/cards/sample.png"
    }
    deck['island4'] 		= { 
	name: "Isle"    					, 
	type: "land"						,
	color: "blue"						,
	img: "/forge/img/cards/sample.png"
    }
    deck['island5'] 		= { 
	name: "Isle"    					, 
	type: "land"						,
	color: "blue"						,
	img: "/forge/img/cards/sample.png"
    }
    deck['island6'] 		= { 
	name: "Isle"    					, 
	type: "land"						,
	color: "blue"						,
	img: "/forge/img/cards/sample.png"
    }
    deck['island7'] 		= { 
	name: "Isle"    					, 
	type: "land"						,
	color: "blue"						,
	img: "/forge/img/cards/sample.png"
    }
    deck['island8'] 		= { 
	name: "Isle"    					, 
	type: "land"						,
	color: "blue"						,
	img: "/forge/img/cards/sample.png"
    }
    deck['island9'] 		= { 
	name: "Isle"    					, 
	type: "land"						,
	color: "blue"						,
	img: "/forge/img/cards/sample.png"
    }
    deck['island10'] 		= { 
	name: "Isle"    					, 
	type: "land"						,
	color: "blue"						,
	img: "/forge/img/cards/sample.png"
    }
    deck['island11'] 		= { 
	name: "Isle"    					, 
	type: "land"						,
	color: "blue"						,
	img: "/forge/img/cards/sample.png"
    }
    deck['island12'] 		= { 
	name: "Isle"    					, 
	type: "land"						,
	color: "blue"						,
	img: "/forge/img/cards/sample.png"
    }
    deck['island13'] 		= { 
	name: "Isle"    					, 
	type: "land"						,
	color: "blue"						,
	img: "/forge/img/cards/sample.png"
    }

    return deck;

  }
  returnWhiteDeck() {

    var deck = {};

    deck['w001'] 	= {
	name: "w001"				, 
	type: "creature"					,
	color: "white"						,
	cost: ['*','white']					,
	power: 1						,
	toughness: 3						,
	properties: ['flying']					,
	img: "/forge/img/cards/sample.png"
    }
    deck['w002'] 	= { 
	name: "w002"    					, 
	type: "creature"					,
	color: "white"						,
	cost: ['*','*','*','*','white']				,
	power: 3						,
	toughness: 2						,
	properties: ['flying']					,
	img: "/forge/img/cards/sample.png"			,
	onEnterBattlefield: function(game_self, player, card) {
	  game_self.updateLog("When Dawning Angel enters battlefield, gain 4 life.");
	  game_self.game.status.player[player-1].health += 4;
          return 1;
        }
    }
    deck['w003'] 	= { 
	name: "w002"    				,
	type: "creature"					,
	color: "white"						,
	cost: ['*','*','white']					,
	power: 3						,
	toughness: 2						,
	properties: []						,
	img: "/forge/img/cards/sample.png"			,
	onEnterBattlefield: function(game_self, player, card) {
	  game_self.updateLog("UNIMPLEMENTED: when Haazda Officer enters battlefield, target creature gains +1/+1 until end of turn");
          return 1;
        }
    }
    deck['w004'] 	= { 
	name: "w004"    				, 
	type: "creature"						,
	color: "white"						,
	cost: ['*','*','white']					,
	power: 2						,
	toughness: 2						,
	properties: ['flying']					,
	img: "/forge/img/cards/sample.png"			,
	onAttack: function(game_self, player, card) {
	  game_self.updateLog("UNIMPLEMENTED: when attacks, target attacking creature without flying gains flying until end of turn");
          return 1;
        }
    }
    deck['inspired-charge'] 	= { 
	name: "Inspired Charge"    				, 
	type: "instant"						,
	color: "white"						,
	cost: ['*','*','white']					,
	img: "/forge/img/cards/sample.png"			,
	onInstant: function(game_self, player, card) {
	  game_self.updateLog("UNIMPLEMENTED: all controlled creatures gain +2/+1 until end of turn");
	  return 1;
	}
    }
    deck['plains1'] 		= { 
	name: "Grasslands"    					, 
	type: "land"						,
	color: "white"						,
	img: "/forge/img/cards/sample.png"
    }
    deck['plains2'] 		= { 
	name: "Grasslands"    					, 
	type: "land"						,
	color: "white"						,
	img: "/forge/img/cards/sample.png"
    }
    deck['plains3'] 		= { 
	name: "Grasslands"    					, 
	type: "land"						,
	color: "white"						,
	img: "/forge/img/cards/sample.png"
    }
    deck['plains4'] 		= { 
	name: "Grasslands"    					, 
	type: "land"						,
	color: "white"						,
	img: "/forge/img/cards/sample.png"
    }
    deck['plains5'] 		= { 
	name: "Grasslands"    					, 
	type: "land"						,
	color: "white"						,
	img: "/forge/img/cards/sample.png"
    }
    deck['plains6'] 		= { 
	name: "Grasslands"    					, 
	type: "land"						,
	color: "white"						,
	img: "/forge/img/cards/sample.png"
    }
    deck['plains7'] 		= { 
	name: "Grasslands"    					, 
	type: "land"						,
	color: "white"						,
	img: "/forge/img/cards/sample.png"
    }
    deck['plains8'] 		= { 
	name: "Grasslands"    					, 
	type: "land"						,
	color: "white"						,
	img: "/forge/img/cards/white/plains.jpg"
    }
    deck['plains9'] 		= { 
	name: "Grasslands"    					, 
	type: "land"						,
	color: "white"						,
	img: "/forge/img/cards/sample.png"
    }
    deck['plains10'] 		= { 
	name: "Grasslands"    					, 
	type: "land"						,
	color: "white"						,
	img: "/forge/img/cards/sample.png"
    }
    deck['plains11'] 		= { 
	name: "Grasslands"    					, 
	type: "land"						,
	color: "white"						,
	img: "/forge/img/cards/sample.png"
    }
    deck['plains12'] 		= { 
	name: "Grasslands"    					, 
	type: "land"						,
	color: "white"						,
	img: "/forge/img/cards/sample.png"
    }
    deck['plains13'] 		= { 
	name: "Grasslands"    					, 
	color: "white"						,
	type: "land"						,
	img: "/forge/img/cards/sample.png"
    }

    return deck;

  }

  importCard(key, card, player) {

    let game_self = this;

    let c = {};
	c.key = key;
	c.player = player;
        c.name = "Unnamed";
        c.color = "*";
        c.cost = [];
        c.power = 0;
        c.toughness = 0;
        c.text = "This card has not provided text";
	c.img = "/img/cards/sample.png";
	c.tapped = "";

    if (card.name) 	{ c.name = card.name; }
    if (card.color) 	{ c.color = card.color; }
    if (card.cost) 	{ c.cost = card.cost; }
    if (card.text) 	{ c.text = card.text; }
    if (card.type) 	{ c.type = card.type; }
    if (card.power) 	{ c.power = card.power; }
    if (card.toughness) { c.toughness = card.toughness; }
    if (card.img) 	{ c.img = card.img; }

    //
    // add dummy events that return 0 (do nothing)
    //
    if (!c.onInstant) 		{ c.onInstant = function(game_self, player, card) { return 0; } };
    if (!c.onEnterBattlefield) 	{ c.onEnterBattlefield = function(game_self, player, card) { return 0; } };
    if (!c.onCostAdjustment) 	{ c.onCostAdjustment = function(game_self, player, card) { return 0; } };

    c.returnElement = function(card) { return game_self.returnElement(game_self, player, c.key); }

    game_self.game.cards[c.key] = c;

  }

  //
  // this controls the display of the card
  //
  returnElement(game_self, player, cardkey) {

    let card = game_self.game.cards[cardkey];
    let tapped = "";
    if (card.tapped == 1) { tapped = " tapped"; }

    return `
      <div class="deployed-card ${tapped}" id="p${player}-${cardkey}">
        <img src="${card.img}" class="deployed-card-image" />
      </div>
    `;
  }

}


module.exports = Forge;

