#!/usr/bin/env node

const puppeteer = require('puppeteer');
const https = require('https');
const http = require('http');
const fs = require('fs');
var url = require("url");
const uuid = require('uuid');
var path = require("path");
var UglifyJS = require("uglify-js");
const {exec} = require("child_process");
var crypto = require('crypto');
var md5sum = crypto.createHash('md5');
var uglifycss = require('uglifycss');
const program = require('commander');

program.version('0.1.0');

process.env['NODE_TLS_REJECT_UNAUTHORIZED'] = 0;

program
    .command('gather <appname> <appurl>')
    .description('Gather CSS and JavaScript for a website URL.')
    .action(function (appname, appurl) {
        (async () => {
            const browser = await puppeteer.launch();
            const page = await browser.newPage();

            var scripts = [];
            var css = [];

            var DIR = "sites/" + appname;
            fs.mkdir(DIR, {recursive: true}, (err) => {
            });
            fs.mkdir(DIR + "/files", {recursive: true}, (err) => {
            });

            if (appurl.indexOf("http:") == 0) {
                console.log("Using http protocol");
                protocol = http
            }
            if (appurl.indexOf("https:") == 0) {
                console.log("Using https protocol");
                protocol = https
            }

            page.on('request', async (interceptedRequest) => {
                // We intercept all requests whose type is 'script'
                if (interceptedRequest.resourceType() === 'stylesheet') {
                    console.log("CSS:", interceptedRequest.url());
                    var parsed = url.parse(interceptedRequest.url());
                    var filename = path.basename(parsed.pathname);

                    if (css.includes(filename)) {
                        return;
                    }
                    try {
                        const pos = crypto.createHash('md5').update(interceptedRequest.url()).digest('hex');

                        css.push({
                            'filename': filename,
                            'local': DIR + "/" + pos + "_" + filename,
                            'url': interceptedRequest.url()
                        });

                        const file = fs.createWriteStream(DIR + "/" + pos + "_" + filename);
                        const response = protocol.get(interceptedRequest.url(), function (response) {

                            const pos = crypto.createHash('md5').update(interceptedRequest.url()).digest('hex');
                            response.pipe(file);

                        });

                    } catch (e) {
                        console.log(e);
                    }
                }
                if (interceptedRequest.resourceType() === 'script') {
                    console.log("Script:", interceptedRequest.url());
                    var parsed = url.parse(interceptedRequest.url());
                    var filename = path.basename(parsed.pathname);

                    if (scripts.includes(filename)) {
                        return;
                    }
                    try {
                        const pos = crypto.createHash('md5').update(interceptedRequest.url()).digest('hex');

                        scripts.push({
                            'filename': filename,
                            'local': DIR + "/" + pos + "_" + filename,
                            'url': interceptedRequest.url()
                        });
                        const file = fs.createWriteStream(DIR + "/files/" + filename);
                        const response = protocol.get(interceptedRequest.url(), function (response) {

                            const pos = crypto.createHash('md5').update(interceptedRequest.url()).digest('hex');
                            response.pipe(file);
                            console.log("uglifyjs --mangle " + DIR + "/files/" + filename + " > " + DIR + "/" + filename);
                            exec("uglifyjs " + DIR + "/files/" + filename + " > " + DIR + "/" + pos + "_" + filename + " --mangle --compress", (error, stdout, stderr) => {
                                if (error) {
                                    console.log(`error: ${error.message}`);
                                    return;
                                }
                                if (stderr) {
                                    console.log(`stderr: ${stderr}`);
                                    return;
                                }
                            });
                        });

                    } catch (e) {
                        console.log(e)
                    }

                }
            });

            // Instructs the blank page to navigate a URL
            await page.goto(appurl);
            await page.waitForSelector('title');

            const styles = await page.evaluate(async () => {
                return await new Promise(resolve => {

                    const s = Array.from(document.querySelectorAll('style'), element => element.textContent);

                    resolve(s);
                });
            });

            var _style = "";

            var stylebundle = styles.join("\n");

            fs.writeFileSync(DIR + "/styles.css", stylebundle, () => {
            });

            css.push({'filename': "styles.css", 'local': DIR + "/styles.css", 'url': ""});

            const doc = await page.evaluate(async () => {
                return await new Promise(resolve => {

                    resolve(document.body.innerHTML);
                });
            });

            fs.writeFileSync(DIR + "/index.html", doc, () => {
            });
            const title = await page.title();
            console.info(`The title is: ${title}`);
            try {
                console.log("Evaluating...");

                console.log(css);
                console.log(scripts);

                fs.writeFile(DIR + "/scripts.json", JSON.stringify(scripts), () => {
                });
                fs.writeFile(DIR + "/css.json", JSON.stringify(css), () => {
                });

                const html = await page.evaluate(async scripts => {

                    return await new Promise(resolve => {
                        var s = [];
                        scripts.forEach(function (script) {
                            const ascripts = document.getElementsByTagName('script');
                            for (var i = 0; i < ascripts.length; i++) {
                                if (script['url'].indexOf(ascripts[i].getAttribute("src")) > -1) {
                                    s.push(script['url']);
                                    s.push(ascripts[i].getAttribute("src"));
                                    ascripts[i].parentNode.removeChild(ascripts[i]);
                                } else {

                                }
                            }

                        });
                        resolve(document.body.innerHTML);
                    })
                }, scripts);

                fs.writeFileSync(DIR + "/bundle.html", html, () => {

                });

                await browser.close();

            } catch (err) {
                console.log(err);
            }


        })();

    });

program
    .command('bundle <appname>')
    .description('Bundle, minify and obfuscate CSS and JavaScript for a gathered app.')
    .action(function (appname) {
        var bundle = "";
        var styles = [];

        var DIR = "sites/"+appname;
        var scripts = JSON.parse(fs.readFileSync(DIR + "/scripts.json"));
        var css = JSON.parse(fs.readFileSync(DIR + "/css.json"));

        css.forEach(function (v) {
            console.log("Reading " + v['local']);
            styles.push(v['local']);
        });

        scripts.forEach(function (v) {
            console.log("Reading " + v['local']);
            var contents = fs.readFileSync(v['local'], 'utf8');
            bundle += contents;
        });

        var uglified = uglifycss.processFiles(
            styles,
            {maxLineLen: 500, expandVars: true}
        );

        fs.writeFile(DIR + "/bundle.css", uglified, () => {
            console.log("Wrote bundle: "+DIR + "/bundle.css");
        });
        fs.writeFile(DIR + "/bundle.js", bundle, () => {
            console.log("Wrote bundle: "+DIR + "/bundle.js");
        });

    });

program.parse(process.argv);

