require('dotenv').config();
const { MongoClient } = require('mongodb');

const url = process.env.MONGO_URI;
const client = new MongoClient(url);
const dbName = 'nba_db';

async function testMatchup(db, p1NameInput, p2NameInput) {
    console.log(`\nTesting Matchup: ${p1NameInput} vs ${p2NameInput}`);

    // 1. Resolve Players
    const p1Doc = await db.collection('players').findOne({ player: { $regex: p1NameInput, $options: 'i' } }, { collation: { locale: 'en', strength: 1 }, sort: { gamesPlayed: -1 } });
    const p2Doc = await db.collection('players').findOne({ player: { $regex: p2NameInput, $options: 'i' } }, { collation: { locale: 'en', strength: 1 }, sort: { gamesPlayed: -1 } });

    if (!p1Doc || !p2Doc) {
        console.log('One or both players not found.');
        return;
    }

    const p1Name = p1Doc.player;
    const p2Name = p2Doc.player;
    console.log(`Resolved: ${p1Name} vs ${p2Name}`);

    // 2. Fetch Games
    const p1Games = await db.collection('players').find({ player: p1Name }).project({ gameId: 1, team: 1, PTS: 1, win: 1 }).toArray();
    const p2Games = await db.collection('players').find({ player: p2Name }).project({ gameId: 1, team: 1, PTS: 1, win: 1 }).toArray();

    const p2GameMap = new Map(p2Games.map(g => [g.gameId, g]));

    let gamesFound = 0;
    let p1Wins = 0;
    let p2Wins = 0;
    let p1Pts = 0;
    let p2Pts = 0;

    for (const g1 of p1Games) {
        const g2 = p2GameMap.get(g1.gameId);
        if (g2 && g1.team !== g2.team) {
            gamesFound++;
            if (g1.win) p1Wins++;
            if (g2.win) p2Wins++;
            p1Pts += (g1.PTS || 0);
            p2Pts += (g2.PTS || 0);
        }
    }

    if (gamesFound > 0) {
        console.log(`Total Games: ${gamesFound}`);
        console.log(`${p1Name} Wins: ${p1Wins} (Avg PTS: ${(p1Pts / gamesFound).toFixed(1)})`);
        console.log(`${p2Name} Wins: ${p2Wins} (Avg PTS: ${(p2Pts / gamesFound).toFixed(1)})`);
    } else {
        console.log('No head-to-head games found.');
    }
}

async function verify() {
    try {
        await client.connect();
        const db = client.db(dbName);

        await testMatchup(db, 'lebron', 'durant');
        await testMatchup(db, 'kobe', 'pierce');

    } catch (err) {
        console.error(err);
    } finally {
        await client.close();
    }
}

verify();
