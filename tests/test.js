const request = require("supertest");
const express = require("express");
const server = require("../server");
const session = require('express-session');
const secret = require('../secret');
const expect = require('chai').expect;


describe("GET /loginAdmin", function () {

    it("Should login user as admin.", async function () {
        var mockApp = express();
        mockApp.use(session({ 
            secret: secret.mySecret,
            cookie: { maxAge: 3600000 }, //A user session expires after 60 minutes
            resave: true,
            saveUninitialized: true
        }));
        mockApp.all('*', function(req, res, next) {
            req.session.logged = false;
            next();
        });
        mockApp.use(server.app);

        const response = await request(mockApp).get('/loginAdmin?username=admin&password=1234');
        expect(response.body.message).to.eql("Admin is logged in.");
    });


    it("Should notify admin that he's already logged in.", async function () {
        var mockApp = express();
        mockApp.use(session({ 
            secret: secret.mySecret,
            cookie: { maxAge: 3600000 }, //A user session expires after 60 minutes
            resave: true,
            saveUninitialized: true
        }));
        mockApp.all('*', function(req, res, next) {
            req.session.logged = true; //we are already logged in.
            next();
        });
        mockApp.use(server.app);

        const response = await request(mockApp).get('/loginAdmin?username=admin&password=1234');
        expect(response.body.message).to.eql("Admin is already logged in.");
    });
});


describe("GET /logoutAdmin", function () {    
    it("Should logout the admin.", async function () {
        var mockApp = express();
        mockApp.use(session({ 
            secret: secret.mySecret,
            cookie: { maxAge: 3600000 }, //A user session expires after 60 minutes
            resave: true,
            saveUninitialized: true
        }));
        mockApp.all('*', function(req, res, next) {
            //authenticated(req, res, next);
            //OR
            req.session.logged = true;
            next();
        });
        mockApp.use(server.app);
      
        const response = await request(mockApp).get('/logoutAdmin');
        expect(response.body.message).to.eql("Admin is now logged out.");
        
    });
});
