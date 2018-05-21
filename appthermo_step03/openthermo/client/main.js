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
            }
            else
            {
                //impostiamo testi e valori per i termostati non connessi
                thermo.temperature= "...";
                thermo.state = "waiting";
                thermo.state_label = "Attendo dati...";
            }
        console.log("thermo in client:", thermo);
    });
    //restituisce l'array di oggetti "termostato" al codice.
    return thermos;
  },
  refreshstate() {
    return (Session.get("refresh"));
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
});