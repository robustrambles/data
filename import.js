const fetch = require('node-fetch');
const YAML = require('yaml');
const { JSDOM } = require('jsdom');
const showdown = require('showdown');
const fs = require('fs');

const { window } = new JSDOM('');

YAML.scalarOptions.str.fold.lineWidth = 0;

const generateResponse = async (seriesUrl, walk) => {
    const { content } = walk;
    delete walk.content;
    const file = `---\n${YAML.stringify(walk)}---\n${content}`;
    return fs.promises.writeFile(`./walks/${seriesUrl}/${walk.slug}.md`, file);
};

const init = async () => {
    const dymchurchToDidcot = await fetch('http://www.robustrambles.co.uk/walks/toFrontMatter.php?series=dymchurch-to-didcot-robust-ramble').then(r => r.json());
    const doverToDorking = await fetch('http://www.robustrambles.co.uk/walks/toFrontMatter.php?series=dover-to-dorking-robust-ramble').then(r => r.json());

    const converter = new showdown.Converter();
    await Promise.all([dymchurchToDidcot, doverToDorking].map(walks => Promise.all(walks.map(async walk => {
        walk.walkContent = converter.makeMarkdown(walk.walkContent, window.document);
        if (!fs.existsSync(`./walks/${walk.seriesUrl}`)) {
            await fs.promises.mkdir(`./walks/${walk.seriesUrl}`);
            const { seriesDesc, seriesUrl, seriesName } = walk;
            const seriesContent = converter.makeMarkdown(seriesDesc, window.document);
            const seriesMetadata = `---\n${YAML.stringify({
                name: seriesName,
                slug: seriesUrl
            })}---\n${seriesContent}`;
            await fs.promises.writeFile(`./walks/${walk.seriesUrl}/_metadata.md`, seriesMetadata);
        }
        walk.walkDetails.Comment += '\n';
        const seriesUrl = walk.seriesUrl;
        Object.keys(walk).forEach(key => {
            if (key.startsWith('walk')) {
                let newKey = key.substr(4).toLowerCase();
                switch(key) {
                    case 'walkMap':
                        walk['portraitMap'] = walk.walkMap.isPortrait;
                        break;
                    case 'walkUrl':
                        newKey = 'slug';
                    default:
                        walk[newKey] = walk[key];
                }
            }
            delete walk[key];
        });
        await generateResponse(seriesUrl, walk);
    }))));
};
init();