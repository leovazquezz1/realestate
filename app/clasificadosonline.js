'use strict';

var Promise = require('promise');
const cheerio = require('cheerio');
const Post = require('../models/Post');
const puppeteer = require('puppeteer');
const sgMail = require('@sendgrid/mail');

sgMail.setApiKey(process.env.SENDGRID_API_KEY);

var scrape = async (place, type, offset) => {
    const browser = await puppeteer.launch();
    const page = await browser.newPage();

    try {

        page.setViewport({ width: 1280, height: 926 });

        var url = 'https://www.clasificadosonline.com/m/BienesRaicesRentaListingM.asp?RentalsPueblos=' + place + '&Category=' + type + '&LowPrice=199&HighPrice=600&Bedrooms=1&txtKeyword=&IncPrecio=1&Submit2=Search+Busqueda';

        if (offset) {
            url += '&offset=' + offset;
        }

        await page.goto(url, {
                    waitUntil: 'networkidle2',
                    timeout: 0
                });

        console.log("Started scraping " + place + " in " + type + " - " + offset);

        page.on('pageerror', pageerr => {
            console.log('pageerror occurred: ', pageerr);
        });

        page.on('error', err => {
            console.log('error happen at the page: ', err);
        });

        var resultsSelector = '.dv-horizontal-separator-e2';
        await page.waitForSelector(resultsSelector);

        var content = await page.content();
        var $ = cheerio.load(content);

        var posts = $(".Ver14");

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
        
        allPosts.forEach(async function(post) {
            var postDB = await Post.findOne({id: post.id});

            if (!postDB) {
                var notifyAndUpdate = await createPostAndNotify(post);
            }
        });

        await browser.close();

        console.log("aqui", allPosts.length);

        if (allPosts.length >= 30 && offset < 500) {

            scrape(place, type, offset + 30);
        } else {
            return false
        }
    } catch (err) {
        throw new Error(err);
    }
};

async function createPostAndNotify(post) {
    try {
        var newPost = await Post.create(post);
    } catch (err) {
        throw new Error(err);
    }

    sendTemplateEmail('APA', post.description, post.url);

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
    sgMail.send(msg);
}

// sendTemplateEmail('test', 'url', 'joder');
    
// startScraping();