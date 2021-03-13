'use strict';

var Promise = require('promise');
const cheerio = require('cheerio');
const Post = require('../models/Post');
const puppeteer = require('puppeteer');
const CronJob = require('cron').CronJob;
const sgMail = require('@sendgrid/mail');

sgMail.setApiKey(process.env.SENDGRID_API_KEY);
const defaultImageUrl = 'https://imgcache.clasificadosonline.com/\media\defaultnew.png';

exports.index = function (req, res) {
    res.render('index.hbs', {layout: false});
};

exports.clasificadosData = function (req, res) {

    var sortByColumn = "{ '" + req.body.columns[req.body.order[0].column].data + "': '" +req.body.order[0].dir + "' }";
    var validSort = JSON.stringify(eval("(" + sortByColumn + ")"));

    var options = {
        find: {},
        limit: req.body.length,
        skip: req.body.start,
        sort: JSON.parse(validSort),
        search: {}
    };

    Post.dataTables(options).then(function (table) {
        res.json({
            data: table.data,
            recordsFiltered: table.total,
            recordsTotal: table.total
        });
    });
};

var scrape = async (place, type, offset) => {
    const browser = await puppeteer.launch({
        ignoreDefaultArgs: ['--disable-extensions'],
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
        ]
    });
    const page = await browser.newPage();

    await page.setCacheEnabled(false);

    try {

        page.setViewport({ width: 1280, height: 926 });

        var url = 'https://www.clasificadosonline.com/m/BienesRaicesRentaListingM.asp?RentalsPueblos=' + place + '&Category=' + type + '&LowPrice=199&HighPrice=600&Bedrooms=1&txtKeyword=&IncPrecio=1&Submit2=Search+Busqueda';

        if (offset) {
            url += '&offset=' + offset;
        }

        try {
            var response = await page.goto(url, {
                waitUntil: 'networkidle2',
                timeout: 30000
            });
        } catch (error) {
            console.log("error.name", error.name);
            return
        }

        console.log("Started scraping " + place + " in " + type + " - " + offset);

        page.on('error', err => {
            console.log('error happen at the page: ', err);
        });

        var resultsSelector = '.dv-horizontal-separator-e2';
        await page.waitForSelector(resultsSelector);

        var content = await page.content();
        var $ = cheerio.load(content);

        var posts = $(".Ver14");

        // Get all post from main result screen
        var allPosts = [];
        for (var i = 0; i < posts.length; i++) {
            var post = $(posts[i]);

            var aTag = post.find("a").attr('href');
            var price = post.find("span span").text();
            var description = post.find("strong").text();

            if (aTag) {

                var postId = aTag.match(/\d+/);
                var parsePrice = price.match(/\d+/)[0];
    
                allPosts.push({
                    id: postId[0],
                    url: aTag,
                    price: parsePrice,
                    description
                });
            }
        };

        // Get post information
        for (var post of allPosts) {
            try {
                var response = await page.goto(post.url, {
                    waitUntil: 'networkidle2',
                    timeout: 30000
                });
    
                var resultsSelector = '.Ver14nounder';
                await page.waitForSelector(resultsSelector);

                var content = await page.content();
                var $ = cheerio.load(content);

                var table = $('table:eq(3)');

                var postComment = table.find('.comment');
                var postImage = table.find("img").attr('src');
                var postPhone = table.find('.nodecorationlink').html();
                var longDescription = postComment.text().replace(/\s{2,}/g, ' ').replace('Ver más','').replace('...','').replace(/(\r\n|\n|\r)/gm, "");

                post.phone = postPhone;
                post.image = postImage;
                post.longDescription = longDescription;
            } catch (error) {
                console.log("error.name", error.name);
                return
            }
        };

        // Filter post wanted
        var allPosts = allPosts.filter(function(p) { return !p.image.includes('defaultnew') });

        console.log("allPosts", allPosts);
        
        // Add all post to DB
        allPosts.forEach(async function(post) {
            var postDB = await Post.findOne({id: post.id});

            if (!postDB) {
                var notifyAndUpdate = await createPost(post);
            }
        });

        await browser.close();

        console.log("All post found:", allPosts.length);

        if (allPosts.length >= 30 && offset < 500) {

            scrape(place, type, offset + 30);
        } else {
            console.log("Finished scraping " + place + " in " + type + " - " + offset);
            return false
        }
    } catch (e) {
        console.log(e);
        return false
    }
};

async function createPost(post) {
    try {
        var newPost = await Post.create(post);
    } catch (err) {
        throw new Error(err);
    }
    return newPost;
};

var types = ['Metro', 16, 17, 46, 98, 68, 69, 70, 71, 67, 77, 97, 76]

var places = ['%25', 'Apartamento', 'Casa']

const sleep = (milliseconds) => {
    return new Promise(resolve => setTimeout(resolve, milliseconds))
}

async function startScraping() {
    for (const type of types) {
        for (const place of places) {
            var morePosts = await scrape(type, place, 0);

            await sleep(5000);
        };
    }
};

function sendTemplateEmail(subject, title, description) {
    const msg = {
      to: 'leandro.rios@upr.edu',
      from: 'sendtextpr@gmail.com',
      templateId: 'd-f3bd8c8fb2c84e96aca3395acb93bb79',
      dynamic_template_data: {
        subject: subject,
        title: title,
        description: description
      },
    };
    var emailSent = sgMail.send(msg);

    emailSent.then(function (message) {
        console.log(message);
    })
    .catch(function (err) {
        console.log(err);
    });
};

startScraping();

const startScrapingJob = new CronJob('0 */5 * * *', function () {
    startScraping();
});

startScrapingJob.start();