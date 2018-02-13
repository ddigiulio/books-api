const express = require('express');
const router = express.Router();
const passport = require('passport');
const bodyParser = require('body-parser');
const jsonParser = bodyParser.json();
var mongoose = require('mongoose');
const axios = require('axios')
const parseString = require('xml2js').parseString
router.use(jsonParser);
const { User } = require('../users/models')

const { authors } = require('./models')

const jwtAuth = passport.authenticate('jwt', { session: false });
const loadUser = function (req, res, next) {
    if (req.user.id) {
        User.findById(req.user.id)
            .then(user => {
                req.user = user
                next();
            })
    }
    else {
        next({
            error: "No Authenticated User"
        });
    }
}

router.get("/hi", function(req, res){
    res.json("Hi")
})
router.get("/topAuthors", 
    jwtAuth, 
    loadUser, 
    function (req, res) {
    let user = req.user
    res.send(user.topAuthors)

})

router.get("/authorInfo/:id", jwtAuth, loadUser, function (req, res) {
    let user = req.user
    authors.findById(req.params.id)
        .then(author => {  
            res.send(author)
        })
})

router.post("/authorname/:name", jwtAuth, loadUser, function (request, response) {
    let user = request.user
    var url = "https://www.goodreads.com/api/author_url/"
    var id = request.params.name
    var myurl = url + id;
    var key = "u357GGD3r1AuoeoFpQz2Q"
    axios.get(myurl, {
        params: {
            key
        }
    })
        .then(function (data) {

            parseString(data.data, function (err, result) {
                const param = result.GoodreadsResponse.author[0].$.id
                const url = "https://sleepy-bayou-48369.herokuapp.com/authors/searchAuthor/" + param
                // const url = "http://localhost:8080/authors/searchAuthor/" + param
                let searchResult = [];
                let author= {};
                axios.get(url)
                    .then(result => {
                        const parsed = result.data.GoodreadsResponse.author[0]
                       
                        author = {
                            id : parsed.id[0],
                            name: parsed.name[0],
                            imageSrc: parsed.image_url[0],
                            
                        }
                        
                        searchResult.push(author)
                        user.authorSearch = request.params.name;
                        user.save()
                        .then(() =>{
                            response.send(searchResult)
                        })
                    })
            });
        })
        .catch(function (error) {
            console.log(error);
            response.send(error);
        });
})

router.post("/topAuthorAdd/:authorID", jwtAuth, loadUser, function (request, response) {


    let user = request.user
    var url = "https://www.goodreads.com/api/author_url/"
    var id = user.authorSearch
    var myurl = url + id;
    var key = "u357GGD3r1AuoeoFpQz2Q"
    axios.get(myurl, {
        params: {
            key
        }
    })
        .then(function (data) {

            parseString(data.data, function (err, result) {
                const param = result.GoodreadsResponse.author[0].$.id
                const url = "https://sleepy-bayou-48369.herokuapp.com/authors/searchAuthor/" + param
                // const url = "http://localhost:8080/authors/searchAuthor/" + param
                let searchResult = [];
                let author= {};
                axios.get(url)
                    .then(result => {
                        const parsed = result.data.GoodreadsResponse.author[0]
                        
                        let description= parsed.about[0]
                        description = description.replace(/<.*?>/g,"")
                        let about = description;
                       
                        authors.create({
                            name: parsed.name[0],
                            about: about,
                            imageSrc: parsed.image_url[0],
                            smallImageSrc: parsed.small_image_url[0],
                            born: parsed.born_at[0],
                            died: parsed.died_at[0],
                            hometown: parsed.hometown[0],
                          
                        })
                            .then(author => {
                                user.topAuthors.push(author)
                                user.save()
                                    .then(() => {
                                       
                                        response.send(user.topAuthors)
                                    })
                            })
                    })
            });
        })
        .catch(function (error) {
            console.log(error);
            response.send(error);
        });
})

//this only gets called by other function
router.get("/searchAuthor/:id", function (request, response) {

    var url = "https://www.goodreads.com/author/show/"
    var id = request.params.id
    var myurl = url + id;
    var key = "u357GGD3r1AuoeoFpQz2Q"
    axios.get(myurl, {
        params: {
            key
        }
    })
        .then(function (data) {

            parseString(data.data, function (err, result) {

                response.send(result)
            });

        })
        .catch(function (error) {
            console.log(error);
            response.send(error);
        });
})

router.delete("/deleteAuthor/:id", jwtAuth, loadUser, function (req, res){
    let user = req.user;
    authors.findByIdAndRemove(req.params.id)
    .then( () =>{
        const removed = user.topAuthors.filter(author => author._id != req.params.id)
        user.topAuthors = removed;
        user.save()
        .then(() => {
            res.send(user.topAuthors)
        })
    })
 
})

module.exports = { router };