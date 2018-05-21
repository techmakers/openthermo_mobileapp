//Import package to manage templates
import { Template } from 'meteor/templating';
//Adding main html page to the meteor app
import './main.html';
import { Session } from 'meteor/session';
import { Tokens } from '/database/collections.js';


//Inserendo il comando in onCreated, verrà eseguito all'avvio dell'app
Template.monitor.onCreated(function () {
    //Memorize the current view of the app:
    ////main: The main control screen
    ////tokens: Tokens management window opened
    Session.set("area", "main");
    Session.set("edittokens", "edit");

    //la subscribe rende accessibili all'app tutti i token del db
    Meteor.subscribe('tokens.all', function () {
    //output di debug eseguito una volta completata la subscribe
    console.log("tokens ready");
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
});