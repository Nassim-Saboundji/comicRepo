const db = require('./dummyDBCredentials');
const express = require('express');
const acm = require('./addComicManager')
const achm = require('./addChapterManager');
const session = require('express-session');
const secret = require('./secret');
const app = express();
const port =  3000;

//This required to access the body of post requests
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

//For loading uploaded images we make the uploads folder accessible
app.use('/static',express.static('uploads'));


app.use(session({ 
    secret: secret.mySecret,
    cookie: { maxAge: 60000 },
    resave: true,
    saveUninitialized: true
}));

app.get('/loginAdmin', (req, res, next) => {
    //Check if the session with the logged key exists in the session.
    console.log(req.session.logged);
    if (req.session.logged == undefined || req.session.logged == false) {
        db.pool.query(
            "SELECT EXISTS(SELECT 1 FROM admin_user WHERE username=$1::text AND user_password=sha256($2))",
            [req.query.username, req.query.password],
            (error, results) => {
                if (error) {
                    throw error;
                }
                if(results.rows[0].exists) {
                    req.session.logged = true;
                    res.json({message: "Admin is logged in."});
                } else {
                    req.session.logged = false;
                    res.json({message: "Admin was not able to login."});
                }
            }
        );
    }

    if (req.session.logged == true) {
        res.json({message: "Admin is already logged in."});
    }
});


app.get('/logoutAdmin', (req, res, next) => {
    if (req.session.logged == true) {
        req.session.logged == false;
        res.json({message: "Admin is now logged out."});
    } else {
        res.json({message: "Admin is already logged out."});
    }
});

/*
This routes allows the user to add a comic to the comicRepo
The user must have submitted a title, information about the comic (synopsis, authors, etc...)
and an image file for the comic poster (which is a cover image 
that represents the comic as a whole).

This route will return a json object which will tell the client
if the operation was successful or not and why if he latter.
*/
app.post('/addComic', acm.addComicUpload.single('poster'), function (req, res, next) {
    if(acm.addComicData.message == "Upload was successful.") {
        db.pool.query(
            "INSERT INTO comic(comic_title, comic_poster, comic_info) VALUES ($1::text,$2::text,$3::text)",
            [acm.addComicData.title, acm.addComicData.poster, acm.addComicData.info],
            (error, results) => {
                if (error) {
                  throw error;
                }
            }
        );
    }
    
    res.json({message: acm.addComicData.message});
});



app.post('/addChapter', achm.addChapterUpload.array('pages', 100), function (req, res, next) {
    if (achm.addChapterData.message == "Upload was successful.") {
        db.pool.query(
            "INSERT INTO chapter(chapter_number, chapter_title, comic_id) VALUES ($1,$2::text,$3)",
            [
             achm.addChapterData.chapterNumber,
             achm.addChapterData.chapterTitle,
             achm.addChapterData.comicId
            ],
            (error, results) => {
                if (error) {
                    throw error;
                }
            }
        );

        for (let i = 0; i < achm.addChapterData.chapterPages.length; i++) {
            db.pool.query(
                "INSERT INTO comic_page(page_number, page_image, chapter_number, comic_id)" +
                " VALUES ($1,$2::text,$3,$4)",
                [
                 (i+1),
                 achm.addChapterData.chapterPages[i],
                 achm.addChapterData.chapterNumber,
                 achm.addChapterData.comicId
                ],
                (error, results) => {
                    if (error) {
                        throw error;
                    }
                }
            );
        }
    }
    //reset the content of chapterPages so that we don't reupload
    //the same images twice when the user decides to make another request
    //to this route.
    achm.addChapterData.chapterPages = [];
    res.json({message: achm.addChapterData.message});
});


app.post('/removeComic', function (req, res, next) {
    let comicId = req.body.comicId;
    db.pool.query(
        "DELETE FROM comic WHERE comic_id=$1",
        [comicId],
        (error, results) => {
            if (error) {
                throw error;
            }
            res.json({message: "Comic successfully deleted."});
        }
    );
});

app.post('/removeChapter', function (req, res, next) {
    let comicId = req.body.comicId;
    let chapterNumber = req.body.chapterNumber;
    db.pool.query(
        "DELETE FROM chapter WHERE comic_id=$1 AND chapter_number=$2",
        [comicId, chapterNumber],
        (error, results) => {
            if (error) {
                throw error;
            }
            res.json({message: "Chapter successfully deleted."});
        }
    );
});





//get the ids, title, posters and views for all comics in the comicRepo
app.get('/comics', function (req, res, next) {
    db.pool.query(
        "SELECT comic_id, comic_title, comic_poster FROM comic",
        (error, results) => {
            if (error) {
                throw error;
            }
            res.json(results.rows);
        }
    );
});



//get general information about a comic
app.get('/comic/:comicId', function (req, res, next) {
    let comicId = req.params.comicId;
    db.pool.query(
        //"SELECT * FROM comic NATURAL JOIN chapter WHERE comic_id=$1",
        "SELECT * FROM comic WHERE comic_id=$1",
        [comicId],
        (error, results) => {
            if (error) {
                throw error;
            }
            res.json(results.rows);
        }
    );
});


//get a list of chapters for a given comic by providing its id
app.get('/comic/:comicId/chapters', function (req, res, next) {
    let comicId = req.params.comicId;
    db.pool.query(
        "SELECT * FROM chapter where comic_id=$1",
        [comicId],
        (error, results) => {
            if (error) {
                throw error;
            }
            res.json(results.rows);
        }
    );
});


//get all the pages of a given chapter of a given comic
app.get('/comic/:comicId/:chapterNumber', function (req, res, next) {
    let comicId = req.params.comicId;
    let chapterNumber = req.params.chapterNumber;
    db.pool.query(
        "SELECT page_image FROM comic_page WHERE comic_id=$1 AND chapter_number=$2",
        [comicId, chapterNumber],
        (error, results) => {
            if (error) {
                throw error;
            }
            res.json(results.rows);
        }
    );
});




app.listen(port, () => {
    console.log(`Example app listening at http://localhost:${port}`)
});

