const undici = require("undici")
const fs = require("fs")

const NAMES = require("./names.json")
const NAMEREGEX = new RegExp(`^(${NAMES.first.join("|")})(${NAMES.last.join("|")})\\d\\d?0?$`, "")

if (!fs.existsSync("./cache.json")) {
    fs.writeFileSync("./cache.json", JSON.stringify({}))
}
const cache = require("./cache.json")

setImmediate(async () => {
    while (true) {
        const name = NAMES.first[Math.floor(Math.random() * NAMES.first.length)] + NAMES.last[Math.floor(Math.random() * NAMES.last.length)]
        
        let users = await undici.request(`https://www.roblox.com/search/users/results?maxRows=100&keyword=${name}`)
        users = await users.body.json()

        if(!users.UserSearchResults) continue
        for (user of users.UserSearchResults) {
            if (user.Name.match(NAMEREGEX)) {
                let groups = await undici.request(`https://groups.roblox.com/v1/users/${user.UserId}/groups/roles`)
                groups = await groups.body.json()
                
                if(!groups.data) continue
                for (group of groups.data) {
                    let cursor = ""
                    
                    while (true) {
                        let users = await undici.request(`https://groups.roblox.com/v1/groups/${group.group.id}/roles/${group.role.id}/users?limit=100&sortOrder=Desc&cursor=${cursor}`)
                        users = await users.body.json()
                        
                        if(!users.data) break
                        for (user of users.data) {
                            let res = user.username.match(NAMEREGEX)
                            if(!res)
                                continue
                            if((cache[res[1]] || (cache[res[1]] = [])).includes(user.username))
                                continue
                            cache[res[1]].push(user.username)
                            fs.appendFileSync("alts.txt", `${user.username}:${user.username.split("").reverse().join("")}\n`)
                        }

                        if (!users.nextPageCursor) break
                        cursor = users.nextPageCursor
                    }
                }
            }
        }
    }
})

process.on("SIGINT", () => {fs.writeFileSync("./cache.json", JSON.stringify(cache)); process.exit(0)})
