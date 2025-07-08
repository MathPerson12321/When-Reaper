const link = "https://reaperclone.onrender.com/";

async function fetchJSON(path){
  const res = await fetch(link+path);
  return await res.json();
}

function makeHtml(element){
    const gamediv = document.createElement("div");
    gamediv.id = element.name

    const heading = document.createElement("h3");
    heading.textContent = "Game " + element.name.substring(4);
    heading.id = element.name + "header";

    const desc = document.createElement("p");
    desc.textContent = element.description;
    desc.id = element.name + "desc";

    const linkgame = document.createElement("a");
    linkgame.href = link+element.name;
    linkgame.textContent = "Play here";
    linkgame.id = "linkto"+element.name;

    gamediv.appendChild(heading);
    gamediv.appendChild(desc);
    gamediv.appendChild(linkgame);

    if(element.running){
        const current = document.getElementById("current");
        current.appendChild(gamediv);
        document.getElementById("defaultcur").style.display = "none";
    }else if(element.winner == ""){
        const upcoming = document.getElementById("upcoming");
        upcoming.appendChild(gamediv);
        document.getElementById("default").style.display = "none";
    }

    if(element.winner != "" && element.winner){
        const famediv = document.createElement("div");
        famediv.id = "winnerof"+element.name;

        const linkfame = document.createElement("a");
        linkfame.href = link+element.name;
        let upperstr = element.name.charAt(0).toUpperCase() + element.name.substring(1,4) + " " + element.name.slice(4);
        linkfame.textContent = upperstr + " - " + element.winner;
        linkfame.id = "linkto"+element.name;
        linkfame.href = link+element.name;

        famediv.appendChild(linkfame)

        const hof = document.getElementById("hof");
        hof.appendChild(famediv);
        document.getElementById("famedefault").style.display = "none";
    }
}

async function getGames(){
    let gamedata = await fetchJSON("games")
    for(let i=0;i<gamedata.length;i++){
        let element = gamedata[i];
        makeHtml(element);
    }
}

getGames();



