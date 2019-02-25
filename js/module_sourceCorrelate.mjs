export default class CorrelationTable {

    static correlatedTable = [];

    static buildCorrelationTable(dataSet) {
        this.correlatedTable = [];
        let myOffset = 3;
        for (let pgrm of dataSet.programs) {
            const lastline = pgrm.ops.length;
            for (let i = 0; i < pgrm.lines.length; i++) {
                let srcline = pgrm.lines[i][0];
                let asmlineMin = pgrm.lines[i][1];
                let asmlineMax = (i + 1 < pgrm.lines.length ? pgrm.lines[i + 1][1] - 1 : lastline);
                srcline--;
                asmlineMin = Math.max(asmlineMin--, 0);
                asmlineMax = Math.max(asmlineMax--, 0);
                this.correlatedTable[srcline] = this.correlatedTable[srcline] ? this.correlatedTable[srcline] : [];
                this.correlatedTable[srcline].push({ asmlineMin: (asmlineMin + myOffset), asmlineMax: (asmlineMax + myOffset) });
            }
            myOffset += (pgrm.ops.length + 3);
        }
    }

    static getCorrelatedAsm(srcline_start, srcline_end) {
        if (srcline_end === undefined) { srcline_end = srcline_start; }
        let lines = [];
        for (let index = srcline_start; index <= srcline_end; index++) {
            const element = this.correlatedTable[index];
            if (element === undefined) { continue; }
            lines = lines.concat(element);
        }
        return lines;
    }

    static getCorrelatedSrc(asmLine_start, asmLine_end) {
        if (asmLine_end === undefined) { asmLine_end = asmLine_start; }
        let indexes = [];
        this.correlatedTable.forEach(
            (e, i) => {
                if (e == undefined) { return false; }
                if (
                    e.find((range) => {
                        return range.asmlineMin <= asmLine_end && range.asmlineMax >= asmLine_start;
                    })
                ) {
                    indexes.push(i);
                }
            }
        );
        return indexes;
    }

    //Keys are Src line, values are number of correlated asm lines.
    static getD3formatted() {
        return this.correlatedTable.map((e) => e.reduce((ea, cv) => ea += (cv.asmlineMax - cv.asmlineMin), 0));
    }
}