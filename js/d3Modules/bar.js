class d3_barchart {
    constructor(jqelement, data) {
        this.jqelement = jqelement;
        this.svg = d3.select(jqelement[0]);
        this.margin = { top: 20, right: 20, bottom: 30, left: 40 };
        this.resize();
        this.g = this.svg.append("g")
            .attr("transform", "translate(" + this.margin.left + "," + this.margin.top + ")");
        this.data(data);
        this.rebuild();
    }

    data(d) {
        this.chartdata = d;
    }

    resize() {
        this.height = this.jqelement.height() - this.margin.top - this.margin.bottom;
        this.width = this.jqelement.width() - this.margin.left - this.margin.right;
        this.x = d3.scaleBand().rangeRound([0, this.width]).padding(0.1);
        this.y = d3.scaleLinear().rangeRound([this.height, 0]);
        return this;
    }

    rebuild() {
        const maxy = d3.max(this.chartdata, function (d) { return d.value; });
        this.x.domain(this.chartdata.map(function (d) { return d.id; }));
        this.y.domain([0, maxy]);
        var thischart = this;
        this.g.append("g")
            .attr("class", "axis axis--x")
            .attr("transform", "translate(0," + thischart.height + ")")
            .call(d3.axisBottom(thischart.x));

        this.g.append("g")
            .attr("class", "axis axis--y")
            .call(d3.axisLeft(thischart.y).ticks(maxy))
            .append("text")
            .attr("transform", "rotate(-90)")
            .attr("y", 6)
            .attr("dy", "0.71em")
            .attr("text-anchor", "end")
            .text("Frequency");

        this.g.selectAll(".bar")
            .data(thischart.chartdata)
            .enter().append("rect")
            .attr("class", "bar")
            .attr("x", function (d) { return thischart.x(d.id); })
            .attr("y", function (d) { return thischart.y(d.value); })
            .attr("width", this.x.bandwidth())
            .attr("height", function (d) { return thischart.height - thischart.y(d.value); });
    }
}


class d3_piechart {
    constructor(jqelement, data) {
        this.jqelement = jqelement;
        this.svg = d3.select(jqelement[0]);
        this.svg
            .attr("text-anchor", "middle")
            .style("font", "12px sans-serif");

        this.margin = { top: 20, right: 20, bottom: 30, left: 40 };
        this.resize();

        this.pie = d3.pie()
            .sort(null)
            .value(d => d.value);

        this.color = d3.scaleOrdinal();

        this.g = this.svg.append("g")
            //.attr("transform", "translate(" + this.margin.left + "," + this.margin.top + ")");
            .attr("transform", `translate(${this.width / 2},${this.height / 2})`);

        this.data(data);
        this.rebuild();
    }

    data(d) {
        this.chartdata = d;
        this.color
            .domain(this.chartdata.map(d => d.id))
            .range(d3.quantize(t => d3.interpolateSpectral(t * 0.8 + 0.1), this.chartdata.length).reverse());
    }

    resize() {
        this.height = this.jqelement.height() - this.margin.top - this.margin.bottom;
        this.width = this.jqelement.width() - this.margin.left - this.margin.right;
        const radius = Math.min(this.width, this.height) / 2 * 0.8;
        this.arcLabel = d3.arc().innerRadius(radius).outerRadius(radius);
        this.arc = d3.arc()
            .innerRadius(0)
            .outerRadius(Math.min(this.width, this.height) / 2 - 1);

        return this;
    }

    rebuild() {
        const arcs = this.pie(this.chartdata);
        var thischart = this;
        this.g.selectAll("path")
            .data(arcs)
            .enter().append("path")
            .attr("fill", d => thischart.color(d.data.id))
            .attr("stroke", "white")
            .attr("d", thischart.arc)
            .append("title")
            .text(d => `${d.data.id}: ${d.data.value}`);

        const text = this.g.selectAll("text")
            .data(arcs)
            .enter().append("text")
            .attr("transform", d => `translate(${thischart.arcLabel.centroid(d)})`)
            .attr("dy", "0.35em");

        text.append("tspan")
            .attr("x", 0)
            .attr("y", "-0.7em")
            .style("font-weight", "bold")
            .text(d => d.data.id);

        text.filter(d => (d.endAngle - d.startAngle) > 0.25).append("tspan")
            .attr("x", 0)
            .attr("y", "0.7em")
            .attr("fill-opacity", 0.7)
            .text(d => d.data.value);
    }
}