//Import package to manage templates
import { Template } from 'meteor/templating';
//Adding main html page to the meteor app
import './main.html';
import { Session } from 'meteor/session';
import { Tokens } from '/database/collections.js';
// Importiamo la collection "Devices" dal database
import { Devices } from '/database/collections.js';


//Inserendo il comando in onCreated, verrà eseguito all'avvio dell'app
Template.monitor.onCreated(function () {
    //Memorize the current view of the app:
    ////main: The main control screen
    ////tokens: Tokens management window opened
    Session.set("area", "main");
    Session.set("edittokens", "edit");

    //Iscrizione alla lista dei token
    Meteor.subscribe('tokens.all', function () {
        console.log("tokens ready");
        //Nella funzione eseguita una volta ottenuti tutti i token...
        Tokens.find({}).forEach(function (token) {
            //...effettuiamo una iscrizione ai termostati per ogni token ottenuto
            Meteor.subscribe('devices.token', token.access_token);
            console.log("thermos ready");
        });
    });

    //valori del termostato selezionato nella finestra impostazioni
    //id 
    Session.set("settings.id", "waiting");
    //nome
    Session.set("settings.name", "waiting");
    Session.set("settings.editname", "waiting");
    //stato di accensione
    Session.set("settings.powerstate", "waiting");
    //temperatura desiderata
    Session.set("settings.tempsetpoint", "waiting");
    //stato di sincronizzazione delle impostazioni
    Session.set("settings.updatestatus_label", "waiting");
    Session.set("settings.updatestatus", "waiting");
});


//Helpers return the values requested from html using {{helper}}
Template.monitor.helpers(
{
    //assign visible or hide class to the ui windows
    main_visible() {
    //assign the ui state to contentselected
    var areaSelected = Session.get("area");
    //main screen will have the visible class if it is selected
    if (areaSelected == "main")
        return "visible";
    else return "hide";
    },
    tokens_visible() {
    var areaSelected = Session.get("area");
    //tokens window will have the visible class if it is the selected content
    if (areaSelected == "tokens")
        return "visible";
    else return "hide";
    },
    tokens() {
        tokens = Tokens.find({});
        return tokens;
    },
    edittokens()
    {
      return Session.get("edittokens");
    },
    isTokensEditing() {
        return (Session.get("edittokens")=="confirm");
    },
    isNameEditing() {
        return (Session.get("settings.editname")=="confirm");
    },
    //fill the content in thermo-frame depending on thermo object values
    thermos() {
        //dichiariamo l'array dei termostati
        thermos = [];
        //otteniamo e scriviamo sul log di debug i tokens visibili dall'app
        tokens = Tokens.find({}).fetch();
        console.log("tokens:", tokens);
        //per ogni token...
        tokens.forEach(function (token) {
        console.log("searching thermos with token:", token.access_token);
        //...otteniamo tutti i relativi termostati sul database
        newthermos = Devices.find({
            $and: [
            { access_token: token.access_token },
            { "devicedata.variables.relaisaorb": { $exists: true } }
            ]
        }).fetch();
        //aggiungiamo i termostati ottenuti all'array thermos
        thermos.push.apply(thermos, newthermos);
        });
        thermos.forEach(function (thermo) 
        {
            //spostiamo i dati del termostato che erano contenuti in ulteriori oggetti direttamente nell'oggetto principale
            Object.assign(thermo, thermo.devicedata);
            Object.assign(thermo, thermo.devicedata.variables);
            //controlliamo che il termostato sia connesso
            console.log("connection:", thermo.connected);
            if(thermo.connected)
            {
                //se il termostato è senza nome gli viene assegnato quello particle
                if (!thermo.name) thermo.name = thermo.particlename;
                //scegliamo il valore della proprietà "state", che verrà restituita all'html, in base al dato "relaisaorb"
                if (thermo.heateron == false)
                    thermo.relaisaorb = "heateroff";
                relaisaorb_to_state = {heateroff: "forcedoff", 0: "off", 1: "on"};
                thermo.state = relaisaorb_to_state[thermo.relaisaorb];
                //sempre in base al dato "relaisaorb" scegliamo il testo da visualizzare nel riquadro
                relaisaorb_to_label = { heateroff: "Spento Forzato", 0: "Spento", 1: "Acceso"};
                thermo.state_label = relaisaorb_to_label[thermo.relaisaorb];
                //scegliamo il valore dei campi "powerstate" e "powerstate_label" in base al dato "heateron", che indica se il sistema di riscaldamento è spento manualmente o no
                heateron_to_powerstate = { true: "on", false: "off"};
                thermo.powerstate = heateron_to_powerstate[thermo.heateron];
                heateron_to_label = {true: "On", false: "Off"};
                thermo.powerstate_label = heateron_to_label[thermo.heateron];
                //inizializzamo il campo update
                if (!thermo.update)
                thermo.update = {};
                //scegliamo il testo che indica lo stato di sincronizzazione delle impostazioni del termostato in base al campo update.status
                updatestatus_to_label = { pending: "Invio dati...", error: "Nessuna risposta", invalid: "Comando non accettato", updated: "Aggiornato" };
                thermo.update.status_label = updatestatus_to_label[thermo.update.status];
            }
            else
            {
                //impostiamo testi e valori per i termostati non connessi
                thermo.temperature= "...";
                thermo.state = "waiting";
                thermo.state_label = "Attendo dati...";
                thermo.powerstate = "waiting";
                thermo.powerstate_label = "Attendo dati..";
                thermo.update.status_label = "Attendo dati...";
                thermo.tempsetpoint= "...";  
            }
        console.log("thermo in client:", thermo);

        if (Session.get("selectedThermo") == thermo.id) {
            console.log("open settings of thermo:", thermo.name);
            Session.set("settings.name", thermo.name);
            Session.set("settings.editname", "edit");
            Session.set("settings.id", thermo.id);
            Session.set("settings.access_token", thermo.access_token);
            Session.set("settings.powerstate", thermo.powerstate);
            Session.set("settings.powerstate_label", thermo.powerstate_label);
            Session.set("settings.tempsetpoint", thermo.tempsetpoint);
            Session.set("settings.signal", thermo.signal);
            Session.set("settings.updatestatus_label", thermo.update.status_label);
            Session.set("settings.updatestatus", thermo.update.status);
        }
    });
    //restituisce l'array di oggetti "termostato" al codice.
    return thermos;
  },
  refreshstate() {
    return (Session.get("refresh"));
  },
  settings_visible() {
    var areaSelected = Session.get("area");
    //settings section will have the visible class if it is the selected section
    if (areaSelected == "settings")
      return "visible";
    else return "hide";
  },
  settings: function (settingname) {
    //la funzione utilizza l'argomento per ottenere il valore della variabile Sessione corrispondente
    settingname = "settings." + settingname;
    settingvalue = Session.get(settingname);
    console.log("setting: ", settingname, "; value: ", settingvalue);
    return settingvalue;
  },
});

Template.monitor.events({
    //cliccando l'icona di apertura della finestra dei token, assegniamo "tokens" a "area", selezionando la relativa sezione
    'click #tokens-open'(event, instance) {
        Session.set("area", "tokens");
    },
    //cliccando l'icona di chiusura della finestra dei token, assegniamo "main" a "area", selezionando la sezione principale
    'click #tokens-close'(event, instance) {
        Session.set("area", "main");
    },
    'click #edittokens.edit'(event, instance) {
        Session.set("edittokens", "confirm");
      },
    'click #removetoken'(event, instance) {
        removetoken=this.access_token;
        console.log("removing token", removetoken);
        if(removetoken) {
            Meteor.call("token.remove", removetoken); }
    },
    'click #edittokens.confirm'(event, instance) {
        newtoken=instance.find("#newtoken").value;
        if(newtoken && newtoken!="") {
        console.log("aggiungo nuovo token:",newtoken);
          Meteor.call("token.add", newtoken);
          Session.set("area", "main"); }
        //confermate le modifiche, la finestra torna in modalità pre-modifica
        Session.set("edittokens", "edit");
    },
    'click #refresh'(event, instance) {
        console.log("clicked refresh");
        //otteniamo l'array dei token
        tokens = Tokens.find({}).fetch();
        //per ogni token..
        tokens.forEach(function (token) 
        {
          //impostiamo la variabile refresh con Session.set
            Session.set("refresh", "pending");
          //..chiamiamo il metodo sul server
          Meteor.call("devices.find", token.access_token);
        });
    },
    'click #settings-close'(event, instance) {
        Session.set("area", "main");
    },
    'click #settings-open.true'(event, instance) {
        Session.set("selectedThermo", this.id);
        Session.set("area", "settings");
    },
    //settings.editname, e quindi la classe del controllo, hanno valore "edit". In questo caso il click dà inizio alla modifica del nome.
    'click #editname.edit'(event, instance) {
        //il valore di modifica diventa "confirm"
        Session.set("settings.editname", "confirm");
    },
    //settings.editname, e quindi la classe del controllo, hanno valore "confirm". Ora il click conferma e conclude la modifica del nome.
    'click #editname.confirm'(event, instance) {
        //otteniamo il valore digitato nella casella di testo
        newname=instance.find("#newname").value;
        console.log("digitato nuovo nome: ",newname);
        if(newname && newname!="") {
            //se il testo non è vuoto chiamiamo il metodo lato server "device.name"
            Meteor.call("device.name", {
                access_token: Session.get("settings.access_token"),
                id: Session.get("settings.id"),
                newname: newname
            }); 
        }
        //il valore di modifica ritorna su "edit"
        Session.set("settings.editname", "edit");
    },
    'click #changestate'(event, instance) {
        console.log("clicked changestate button");
        var powerstate = Session.get("settings.powerstate");
        var heateron;
        if (powerstate == "on") {
          powerstate = "off";
          heateron = false;
        }
        else {
          powerstate = "on";
          heateron = true;
        }
        Meteor.call("device.update", {
            access_token: Session.get("settings.access_token"),
            id: Session.get("settings.id"),
            variablename: "heateron",
            argument: heateron
        });
    },
    'click #up'(event, instance) {
        console.log("clicked up button");
        var tempsetpoint = Session.get("settings.tempsetpoint");
        if (tempsetpoint<28)
        {
            tempsetpoint+=0.1;
            tempsetpoint =  Math.round( tempsetpoint * 10) / 10;
            Session.set("settings.tempsetpoint", tempsetpoint);
            Meteor.clearTimeout(Session.get("waitingSetting"));

            waitingSetting = Meteor.setTimeout(function() {
                Meteor.call("device.update", {
                  access_token: Session.get("settings.access_token"),
                  id: Session.get("settings.id"),
                  variablename: "tempsetpoint",
                  argument: tempsetpoint
                });
              }, 1000);
              Session.set("waitingSetting",waitingSetting);
        }
    },
    'click #down'(event, instance) {
        console.log("clicked down button");
        var tempsetpoint = Session.get("settings.tempsetpoint");
        if (tempsetpoint>18)
        {
            tempsetpoint-=0.1;
            tempsetpoint =  Math.round( tempsetpoint * 10) / 10;
            Session.set("settings.tempsetpoint", tempsetpoint);
            Meteor.clearTimeout(Session.get("waitingSetting"));

            waitingSetting = Meteor.setTimeout( function() {
                Meteor.call("device.update", {
                  access_token: Session.get("settings.access_token"),
                  id: Session.get("settings.id"),
                  variablename: "tempsetpoint",
                  argument: tempsetpoint
                });
              }, 1000);
              Session.set("waitingSetting",waitingSetting);
      
        }
    },
});