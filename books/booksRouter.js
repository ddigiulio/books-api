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

const { books } = require('./models')

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

router.get("/hi", function( req, res) {
    res.json("Hi");
})
//endpoint to update the currentlyReading book
router.get("/currentlyReading", jwtAuth, loadUser, function (req, res) {
    let user = req.user
    res.send(user.currentlyReading)
})

router.post("/currentlyReadingAdd/:bookID", jwtAuth, loadUser, function (req, res) {

    let user = req.user
    var myurl = "https://www.goodreads.com/search/index.xml"
    //my goodReads key
    var key = "u357GGD3r1AuoeoFpQz2Q"
    axios.get(myurl, {
        params: {
            q: user.currentSearch,
            key,
        }
    })
        .then(function (data) {
            parseString(data.data, function (err, result) {
        
                const searchResult = []
                const showURL = "https://www.goodreads.com/book/show.xml"
                let book ={};
                for (i = 0; i < 5; i++ ){
                    
                    if(req.params.bookID === result.GoodreadsResponse.search[0].results[0].work[i].best_book[0].id[0]._){
                        let title =result.GoodreadsResponse.search[0].results[0].work[i].best_book[0].title[0];
                        title = title.replace(/\s*\(.*?\)\s*/g,"")
                        book = {
                            author: result.GoodreadsResponse.search[0].results[0].work[i].best_book[0].author[0].name[0],
                            title: title,
                            rating :result.GoodreadsResponse.search[0].results[0].work[i].average_rating[0],
                            imageSrc: result.GoodreadsResponse.search[0].results[0].work[i].best_book[0].image_url[0],
                            pubYear: result.GoodreadsResponse.search[0].results[0].work[i].original_publication_year[0]._,
                            pubMonth : result.GoodreadsResponse.search[0].results[0].work[i].original_publication_month[0]._
                        }
                    }      
                }
                
                axios.get(showURL, {
                    params: {
                        format: "xml",
                        key,
                        id: req.params.bookID,
                    }
                })
                    .then(data => {
                        parseString(data.data, function (err, result) {
                            let description = result.GoodreadsResponse.book[0].description[0]
                            description = description.replace(/<br\s*[\/]?>/g,"")
                            description = description.replace(/<i>/g,"")
                            description = description.replace(/<[\/]i>/g,"")
                           
                            books.create({
                                author: book.author,
                                title: book.title,
                                imageSrc: book.imageSrc,
                                description: description,
                                rating: book.rating,
                                pubYear: book.pubYear,
                                pubMonth: book.pubMonth
                            })
                            .then(book => {
                                user.currentlyReading = book;
                                user.currentSearch="";
                                user.save()
                                .then( () => {
                                    res.send(user.currentlyReading)
                                })

                            }) 
                                            
                        });
                    })           
                
                
            });
        })
        .catch(function (error) {
            res.send(error);
        });
})


//endpoint to search for and update a book by title
router.get("/currentlyReading/:title", jwtAuth, loadUser, function (req, res) {

    let user = req.user
    var myurl = "https://www.goodreads.com/search/index.xml"
    //my goodReads key
    var key = "u357GGD3r1AuoeoFpQz2Q"
    axios.get(myurl, {
        params: {
            q: req.params.title,
            key,
        }
    })
        .then(function (data) {
            parseString(data.data, function (err, result) {
        
                
                const searchResult = []
                const showURL = "https://www.goodreads.com/book/show.xml"
                for (i = 0; i < 5; i++ ){
                let title =result.GoodreadsResponse.search[0].results[0].work[i].best_book[0].title[0];
                title = title.replace(/\s*\(.*?\)\s*/g,"")
                 bookResult =  {  
                 index : i,
                 bookID :result.GoodreadsResponse.search[0].results[0].work[i].best_book[0].id[0]._,
                 rating :result.GoodreadsResponse.search[0].results[0].work[i].average_rating[0],
                 title : title,
                 author: result.GoodreadsResponse.search[0].results[0].work[i].best_book[0].author[0],
                 imageSrc: result.GoodreadsResponse.search[0].results[0].work[i].best_book[0].image_url[0],
                 pubYear : result.GoodreadsResponse.search[0].results[0].work[i].original_publication_year[0]._,
                 pubMonth : result.GoodreadsResponse.search[0].results[0].work[i].original_publication_month[0]._
                }          
                searchResult.push(bookResult);
                }
                user.currentSearch = req.params.title
                user.save()
                .then(() =>{
                    res.send(searchResult)
                })
                
            });
        })
        .catch(function (error) {
            res.send(error);
        });
})

router.get("/topBooks", jwtAuth, loadUser, function (req, res) {
    let user = req.user
    
    res.send(user.topBooks)
})

router.post("/topBookAdd/:bookID", jwtAuth, loadUser, function (req, res) {

    let user = req.user
    var myurl = "https://www.goodreads.com/search/index.xml"
    //my goodReads key
    var key = "u357GGD3r1AuoeoFpQz2Q"
    axios.get(myurl, {
        params: {
            q: user.topBooksSearch,
            key,
        }
    })
        .then(function (data) {
            parseString(data.data, function (err, result) {
        
                
                const searchResult = []
                const showURL = "https://www.goodreads.com/book/show.xml"
                let book ={};
                for (i = 0; i < 5; i++ ){
                    
                    if(req.params.bookID === result.GoodreadsResponse.search[0].results[0].work[i].best_book[0].id[0]._){
                        let title =result.GoodreadsResponse.search[0].results[0].work[i].best_book[0].title[0];
                        title = title.replace(/\s*\(.*?\)\s*/g,"")
                        book = {
                            author: result.GoodreadsResponse.search[0].results[0].work[i].best_book[0].author[0].name[0],
                            title: title,
                            rating :result.GoodreadsResponse.search[0].results[0].work[i].average_rating[0],
                            imageSrc: result.GoodreadsResponse.search[0].results[0].work[i].best_book[0].image_url[0],
                            pubYear: result.GoodreadsResponse.search[0].results[0].work[i].original_publication_year[0]._,
                            pubMonth : result.GoodreadsResponse.search[0].results[0].work[i].original_publication_month[0]._
                        }
                    }      
                }
                
                axios.get(showURL, {
                    params: {
                        format: "xml",
                        key,
                        id: req.params.bookID,
                    }
                })
                    .then(data => {
                        parseString(data.data, function (err, result) {
                            let description = result.GoodreadsResponse.book[0].description[0]
                            description = description.replace(/<.*?>/g," ")
                           
                            books.create({
                                author: book.author,
                                title: book.title,
                                imageSrc: book.imageSrc,
                                description: description,
                                rating: book.rating,
                                pubYear: book.pubYear,
                                pubMonth: book.pubMonth
                            })
                            .then(book => {
                                user.topBooks.push(book)
                                user.topBooksSearch="";
                                user.save()
                                .then( () => {
                                    res.send(user.topBooks)
                                })

                            }) 
                                            
                        });
                    })           
                
                
            });
        })
        .catch(function (error) {
            res.send(error);
        });
})

router.post("/topBooks/:title", jwtAuth, loadUser, function (req, res) {

    let user = req.user
    const myurl = "https://www.goodreads.com/search/index.xml"
    //my goodReads key
    const key = "u357GGD3r1AuoeoFpQz2Q"
    axios.get(myurl, {
        params: {
            q: req.params.title,
            key,
        }
    })
        .then(function (data) {
            parseString(data.data, function (err, result) {

                const searchResult = []
                const showURL = "https://www.goodreads.com/book/show.xml"
                for (i = 0; i < 5; i++ ){
                let title =result.GoodreadsResponse.search[0].results[0].work[i].best_book[0].title[0];
                title = title.replace(/\s*\(.*?\)\s*/g,"")
                 bookResult =  {  
                 index : i,
                 bookID :result.GoodreadsResponse.search[0].results[0].work[i].best_book[0].id[0]._,
                 rating :result.GoodreadsResponse.search[0].results[0].work[i].average_rating[0],
                 title : title,
                 author: result.GoodreadsResponse.search[0].results[0].work[i].best_book[0].author[0],
                 imageSrc: result.GoodreadsResponse.search[0].results[0].work[i].best_book[0].image_url[0],
                 pubYear : result.GoodreadsResponse.search[0].results[0].work[i].original_publication_year[0]._,
                 pubMonth : result.GoodreadsResponse.search[0].results[0].work[i].original_publication_month[0]._
                }          
                searchResult.push(bookResult);
                }
                user.topBooksSearch = req.params.title
                user.save()
                .then(() =>{
                    res.send(searchResult)
                })
                
            });

        })
        .catch(function (error) {

            res.send(error);
        });
})

router.get("/bookInfo/:id", jwtAuth, loadUser, function (req, res) {
    let user = req.user
    books.findById(req.params.id)
        .then(book => {  
            res.send(book)
        })
})

router.delete("/deleteBook/:id", jwtAuth, loadUser, function (req, res){
    let user = req.user;
    books.findByIdAndRemove(req.params.id)
    .then( () =>{
        const removed = user.topBooks.filter(book => book._id != req.params.id)
        user.topBooks = removed;
        user.save()
        .then(() => {
            res.send(user.topBooks)
        })
    })
 
})

module.exports = { router };
