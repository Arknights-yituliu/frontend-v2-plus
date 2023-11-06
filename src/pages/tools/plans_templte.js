
let plans = []
for (let index in [0, 1, 2, 3, 4, 5]) {

    let rooms = {
        trading: [],
        manufacture: [],
        power: [],
        dormitory: [],
        control: [{
            skip:false,
            operators: [],
            sort: false,
            autofill: false
        }],
        hire: [{
            skip:false,
            operators: [],
            sort: false,
            autofill: false
        }],
        meeting: [{
            skip:false,
            operators: [],
            sort: false,
            autofill: false
        }],
    }

    for (let r in [0, 1, 2, 3, 4]) {

        rooms.trading.push({
            skip:false,
            product: 'LMD',
            operators: [],
            sort: false,
            autofill: false
        })

        rooms.manufacture.push({
            skip:false,
            product: 'Battle Record',
            operators: [],
            sort: false,
            autofill: false
        })

        rooms.power.push({
            skip:false,
            operators: [],
            sort: false,
            autofill: false
        })

        rooms.dormitory.push({
            skip:false,
            operators: [],
            sort: false,
            autofill: false
        })
    }

    const plan = {
        name:`第${index+1}班`,
        description:`第${index+1}班的描述`,
        period:['00:00','00:00'],
        room:rooms,
        Fiammetta: {
            enable: false,
            target: "",
            order: "pre"
        },
        drones: {
            room: "trading",
            index: 1,
            enable: false,
            order: "pre"
        }
    }

    plans.push(plan)
}



console.log(JSON.stringify(plans))


export default {}