import './App.css';
import React from 'react';
import Typist from 'react-typist';

import ForceGraph2D from 'react-force-graph-2d';
import * as d3 from 'd3';

import AccountTreeIcon from '@material-ui/icons/AccountTree';
import HelpIcon from '@material-ui/icons/Help';
import InfoIcon from '@material-ui/icons/Info';
import LibraryBooksIcon from '@material-ui/icons/LibraryBooks';
import TuneIcon from '@material-ui/icons/Tune';

import ToggleButton from '@material-ui/lab/ToggleButton';

import { Button, Checkbox,
         FormControl, FormGroup, FormControlLabel,
         LinearProgress, MenuItem, Select, TextField, Tooltip, Zoom } from '@material-ui/core';

import { Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle } from '@material-ui/core/';

import './buyMeACoffeeStyle.css';


export default class App extends React.Component {

  scan = async (id) => {
    let newPapers = {};
    
    let parentLinks = [];
    let parentNodes = [];
    let childrenLinks = [];
    let childrenNodes = [];
    let selfNode = {};
    
    const url = "https://api.semanticscholar.org/v1/paper/" + id;
    await fetch(url).then(res => res.json()).then((out) => {
      for (const i in out["references"]) {
        newPapers[out["references"][i]["paperId"]] = out["references"][i];
        parentLinks.push({"source": out["references"][i]["paperId"], "target": out["paperId"]});
        parentNodes.push({
          "id": out["references"][i]["paperId"],
          "val": 1, 
          "link": out["references"][i]["url"],
          "year": out["references"][i]["year"],
          "name": out["references"][i]["title"],
          "authors": Object.values(out["references"][i]["authors"]).map(e => ' ' + e["name"])
        })
      }

      selfNode = {
        "id": out["paperId"], 
        "val": 1, 
        "link": out["url"],
        "year": out["year"],
        "name": out["title"], 
        "abstract": out["abstract"],
        "authors": Object.values(out["authors"]).map(e => ' ' + e["name"])
      }

      for (const i in out["citations"]) {
        childrenLinks.push({"source": out["citations"][i]["paperId"], "target": out["paperId"]});
        childrenNodes.push({
          "id": out["citations"][i]["paperId"],
          "val": 1, 
          "link": out["citations"][i]["url"],
          "year": out["citations"][i]["year"],
          "name": out["citations"][i]["title"],
          "authors": Object.values(out["citations"][i]["authors"]).map(e => ' ' + e["name"])
        })
      }
    }).catch(err => err.toString() === 'TypeError: NetworkError when attempting to fetch resource.' ? alert('Semantic Scholar\'s API limit reached: cannot look at more than 100 articles within 5 minutes.') : alert(err));

    return {
      "newPapers": newPapers,
      "parents": {"nodes": parentNodes, "links": parentLinks},
      "children": {"nodes": childrenNodes, "links": childrenLinks},
      "self": selfNode,
    };
  }


  update = (completed, total) => {
    const value = Math.round(completed / total * 100);
    this.setState({loadingProgress: value});
  }

  scanArticles = async (allPapersKeys, tickCallback) => {
    let progress = 0;
    let length = allPapersKeys.length;
    // let progress = 0;
    
    const tick = (promise) => {
      promise.then(function () {
        progress++;
        tickCallback(progress, length);
      });
      return promise;
    }
    return {"ticks": Promise.all(allPapersKeys.map(key => this.scan(key, false)).map(tick)),
            "scannedArticles": await Promise.all(allPapersKeys.map(key => this.scan(key, false)))};
  }


  scanAndFilterArticles = async (articlesToScan) => {
    return await this.scanArticles(articlesToScan, this.update).then(result => {
      const scannedArticles = result["scannedArticles"];

      const allPapers = Object.assign({}, ...scannedArticles.map(seenArticle => seenArticle["newPapers"]));
      let parentNodes = scannedArticles.flatMap(seenArticle => seenArticle.parents.nodes);
      let parentLinks = scannedArticles.flatMap(seenArticle => seenArticle.parents.links);
      let childrenNodes = scannedArticles.flatMap(seenArticle => seenArticle.children.nodes);
      let childrenLinks = scannedArticles.flatMap(seenArticle => seenArticle.children.links);

      return {
        "parents": {"nodes": parentNodes, "links": parentLinks},
        "children": {"nodes": childrenNodes, "links": childrenNodes}
      }
    });
  }

  scanChildrenArticles = async (firstArticle) => {
    let [APICalls, jsonAPICalls, callCount] =  await this.getAPICalls();

    const childrenArticlesId = firstArticle.children.nodes.map(node => node.id);
    const childrenArticlesToScan = 98 - callCount > childrenArticlesId.length ? childrenArticlesId : childrenArticlesId.slice(0, Math.max(0, 99 - callCount));
    callCount += childrenArticlesToScan.length;

    jsonAPICalls.calls.push({"count": childrenArticlesToScan.length + 1, "time": new Date().getTime()});
    localStorage.setItem("APICalls", JSON.stringify(jsonAPICalls));

    if (callCount > 95) {
      alert("Semantic Scholar API Call limit (100 calls per 5 min) being reached. Expect incomplete results.");
    }

    const childrenArticles = await this.scanAndFilterArticles(childrenArticlesToScan);
    this.setState({ childrenArticles: childrenArticles });
    return childrenArticles;
  }


  getAPICalls = async () => {
    let APICalls = localStorage.getItem("APICalls");
    let jsonAPICalls = {"calls": []};

    let callCount = 0
    if (APICalls !== null) {
      jsonAPICalls = await JSON.parse(APICalls);


      jsonAPICalls.calls = jsonAPICalls.calls.filter(obj => (new Date().getTime() / 1000) - (parseInt(obj.time) / 1000) <= 300);
      // console.log(jsonAPICalls.calls);

      callCount = jsonAPICalls.calls.reduce(function(prev, cur) {
        return prev + parseInt(cur.count);
      }, 0);
    }
    return [APICalls, jsonAPICalls, callCount];
  }


  search = async (id, getChildrenArticles) => {


    let [APICalls, jsonAPICalls, callCount] =  await this.getAPICalls();

    callCount++;
    const firstArticle = await this.scan(id, true);

    const parentArticlesId = firstArticle.parents.nodes.map(node => node.id);
    
    const articlesToScan = 99 - callCount > parentArticlesId.length ? parentArticlesId : parentArticlesId.slice(0, 99 - callCount);

    callCount += articlesToScan.length;

    jsonAPICalls.calls.push({"count": articlesToScan.length + 1, "time": new Date().getTime()});
    localStorage.setItem("APICalls", JSON.stringify(jsonAPICalls));

    if (callCount > 95) {
      alert("Semantic Scholar API Call limit (100 calls per 5 min) being reached. Expect incomplete results.");
    }

    const parentArticles = await this.scanAndFilterArticles(articlesToScan);

    if (getChildrenArticles) {
      const childrenArticles = await this.scanChildrenArticles(firstArticle);
      return [firstArticle, parentArticles, childrenArticles];
    } else {
      return [firstArticle, parentArticles];
    }
  }

  searchArXiv = async (searchString) => {
    const urlSearch = "https://export.arxiv.org/api/query?search_query=all:" + searchString + "&start=0&max_results=10";
    const out1 = await fetch(urlSearch);
    const out2 = await out1.text();

    // console.log(out2);

    const firstSection = out2.slice(out2.indexOf("<entry>"));
    const closerSection = firstSection.slice(firstSection.indexOf("<id>http://arxiv.org/") + 21, firstSection.indexOf("</id>"));
    const closestSection = closerSection.slice(closerSection.indexOf('/')+1);
    if (closestSection.indexOf('v') !== -1) {
      return closestSection.split('v')[0];
    } else {
      return closestSection;
    }
  }

  getRelevantNodesAndLinks = () => {
    let nodes = [this.state.firstArticle.self];
    let links = [];
    const parentals = ['grandparents', 'parents', 'siblings'];
    const kids = ['partners', 'children', 'grandchildren'];

    if (this.state.checked.some(r=> parentals.includes(r))) {
      nodes = nodes.concat(this.state.firstArticle.parents.nodes);
      links = links.concat(this.state.firstArticle.parents.links);
    } if (this.state.checked.some(r=> kids.includes(r))) {
      nodes = nodes.concat(this.state.firstArticle.children.nodes);
      links = links.concat(this.state.firstArticle.children.links);
    } if (this.state.checked.includes('grandparents')) {
      nodes = nodes.concat(this.state.parentArticles.parents.nodes);
      links = links.concat(this.state.parentArticles.parents.links);
    } if (this.state.checked.includes('partners')) {
     nodes = nodes.concat(this.state.childrenArticles.parents.nodes);
     links = links.concat(this.state.childrenArticles.parents.links);
    } if (this.state.checked.includes('grandchildren')) {
     nodes = nodes.concat(this.state.childrenArticles.children.nodes);
     links = links.concat(this.state.childrenArticles.children.links);
    } if (this.state.checked.includes('siblings')) {
      nodes = nodes.concat(this.state.parentArticles.children.nodes);
      links = links.concat(this.state.parentArticles.children.links);
    }
    //console.log('links', links);


    const seen = new Set();
    const filteredArr = nodes.filter(el => {
      const nodesWithAbstract = nodes.filter(node => node.id === el.id && 'abstract' in node);
      const duplicate = seen.has(el.id);
      seen.add(el.id);
      if (nodesWithAbstract.length > 0) {
        return 'abstract' in el ? true : false;
      }
      return !duplicate;
    });
    return [filteredArr, links];
  }


  handleClick = (name, links, nodes) => {

    links.forEach(link => {
      const a = nodes.find(x => x.id === link.source);
      const b = nodes.find(x => x.id === link.target);
      if (a && b) {
        !a.neighbors && (a.neighbors = []);
        !b.neighbors && (b.neighbors = []);
        a.neighbors.push(b);
        b.neighbors.push(a);

        !a.links && (a.links = []);
        !b.links && (b.links = []);
        a.links.push(link);
        b.links.push(link);
      }
    });

    this.setState({
      inputLinkClicked: true,
      // textContent: result,
      nodesAndLinks: {"nodes": nodes, "links": links},
      // elem: document.getElementById("graphy")

    });
    // console.log(nodes, links);
  };

  setId = () => {
    this.setState({elem: document.getElementById("graphy")});
  };

  constructor(props) {
    super(props);
    this.state = {
      inputLinkClicked: false,
      loading: false,
      loadingProgress: 0,
      selected: false,
      tooltipLabel: "Off",
      open: false,
      textFieldValue: "",
      buttonMessage: "Enter a paper ID (or title/keyword to be searched on arXiv) above to start!",
      ready: false,
      displayingGraph: false,
      orientation: 'null',
      checked: ['parents', 'grandparents'],
      openAbout: false,
    }
  }
  
  setSelected = (abstractOn) => {
    if (abstractOn) {
      this.setState({
        displayAbstract: true,
        selected: true,
        tooltipLabel: "On",
      });
    } else {
      this.setState({
        displayAbstract: false,
        selected: false,
        tooltipLabel: "Off",
      });
    }
  }

  handleClickOpen = () => {
    this.setState({
      open: true,
    })
  };

  handleClose = () => {
    this.setState({
      open: false,
    })
  };

  handleClickSettings = () => {
    this.setState({
      openSettings: true,
    })
  };

  handleCloseSettings = () => {
    this.setState({
      openSettings: false,
    })
  };

  _handleTextFieldChange = (e) => {
      this.setState({
          textFieldValue: e.target.value,
          buttonMessage: "Search",
          ready: true,
      });
  }

  handleSelect = (direction) => {
    this.setState({
      orientation: direction.target.value,
    })
  }

  handleClickAbout = () => {
    this.setState({
      openAbout: true,
    })
  };

  handleCloseAbout = () => {
    this.setState({
      openAbout: false,
    })
  };

  handleCheckbox = async (id, checked) => {
    if (checked) {
      this.setState((state) => ({
          checked: [...state.checked, id],
      }), async () => {
        const parentals = ['grandparents', 'parents', 'siblings'];
        const kids = ['partners', 'children', 'grandchildren'];

        if (this.state.checked.some(r=> kids.includes(r)) && 'childrenArticles' in this.state) {
          const childrenArticles = await this.scanChildrenArticles(this.state.firstArticle);
        }

        const [nodes, links] = this.getRelevantNodesAndLinks();

        const name = this.state.firstArticle.self.name;

        this.setState({loading: false, displayingGraph: true});
        this.handleClick(name, links, nodes);
        this.setId();
      })
    } else {
      this.setState((state) => ({
          checked: state.checked.filter(el => el != id),
      }), () => {
        const [nodes, links] = this.getRelevantNodesAndLinks();

        const name = this.state.firstArticle.self.name;

        this.setState({loading: false, displayingGraph: true});
        this.handleClick(name, links, nodes);
        this.setId();
      })
    }
  }

  handleSearch = async () => {
    const searchString = document.getElementById("textField").value;
    let id = '';
    if (/\s/.test(searchString) || !(/\d/.test(searchString))) {
      id = 'arXiv:' + await this.searchArXiv(searchString);
    } else if (searchString.includes('/') || searchString.length > 20) {
      id = searchString;
    } else if (searchString.includes('.')) {
      id = 'arXiv:' + searchString;
    } else if (searchString.includes('-')) {
      id = 'ACL:' + searchString;
    } else if (/^\d+$/.test(searchString)) {
      id = 'CorpusID:' + searchString;
    } else {
      id = searchString;
    }

    // console.log('id:', id);

    this.setState({loading: true, loadingProgress: 0});
    let [firstArticle, parentArticles, childrenArticles] = [{}, {}, {}];

    const kids = ['partners', 'children', 'grandchildren'];

    let name = '';

    if (this.state.checked.some(r=> kids.includes(r))) {
      [firstArticle, parentArticles, childrenArticles] = await this.search(id, true);
      this.setState({firstArticle: firstArticle, parentArticles: parentArticles, childrenArticles: childrenArticles});
      name = firstArticle.self.name;
    } else {
      const [firstArticle, parentArticles] = await this.search(id, false);
      this.setState({firstArticle: firstArticle, parentArticles: parentArticles});
      name = firstArticle.self.name;
    }

    const [nodes, links] = this.getRelevantNodesAndLinks();

    this.setState({loading: false, displayingGraph: true});
    this.handleClick(name, links, nodes);
    this.setId();
    document.getElementById("submitButton").style.marginTop = "15px";
    document.getElementById("submitButton").style.height = "56px";
    document.getElementById("submitButton").style.marginRight = null;
    document.getElementById("toggleAbstractsButton").style.display = "initial";
    document.getElementById("settingsButton").style.display = "initial";
    document.getElementById("helpButton").style.display = "initial";
    document.getElementById("orientationButton").style.display = "initial";
    document.getElementById("infoButton").style.marginTop = "23px";
  }

  render() {
    const highlightNodes = new Set();
    const highlightLinks = new Set();
    let hoverNode = null;
    let hoverStart = 0;
    let selected = false;
    
    return (
      <div className="App" style={{backgroundColor: "#222"}}>
        <TextField
        onKeyPress={async (ev) => {
          if (ev.key === 'Enter') {
            this.handleSearch();
            ev.preventDefault();
          }
        }}
          id="textField"
          label=<p style={{color: "white", fontSize: '16px', marginTop: '4px', fontFamily: '"Palatino Linotype", "Book Antiqua", Palatino, serif'}}>Paper ID</p>
          type="search"
          variant="outlined"
          onChange={this._handleTextFieldChange}
          style={{color: "white", width: this.state.textFieldValue.length*10.6 + 'px', minWidth: '90px', marginTop: '15px'}}
          InputProps={{
            style: { color: "white", fontFamily: '"Palatino Linotype", "Book Antiqua", Palatino, serif'}
        }}> </TextField>
      {this.state.displayingGraph? '' : <p>{'\n'}</p>}
      <Button
        id="submitButton"
        variant="outlined"
        disabled={!(this.state.ready)}
        style={{color: "white", textTransform: "none", fontFamily: '"Palatino Linotype", "Book Antiqua", Palatino, serif', height: '40px', marginRight: '-64px'}}
        onClick={async () => {
         this.handleSearch();
       }}
      >
          { this.state.ready ?
            <div><Typist style={{color: "white", fontSize: '16px', fontFamily: '"Palatino Linotype", "Book Antiqua", Palatino, serif'}} avgTypingDelay={120} cursor={{ show: false }}>
            <Typist.Delay ms={300}/><p style={{fontSize: '18px'}}>{this.state.buttonMessage}</p></Typist></div>
            : 
        <Typist style={{color: "white", fontSize: '16px', fontFamily: '"Palatino Linotype", "Book Antiqua", Palatino, serif'}} avgTypingDelay={50} cursor={{ hideWhenDone: true, hideWhenDoneDelay: 0 }}>
          <Typist.Delay ms={440}/>{this.state.buttonMessage}
        </Typist> 
          }
      </Button>
      <ToggleButton
        id="toggleAbstractsButton"
        style={{display: "none", marginTop: "15px"}} 
        aria-label="Toggle Abstracts"
        value="check"
        selected={this.state.selected}
        onChange={() => {
          this.setSelected(!this.state.selected);
        }}>
        <Tooltip TransitionComponent={Zoom} style={{fontFamily: '"Palatino Linotype", "Book Antiqua", Palatino, serif'}} title={"View Abstracts: " + this.state.tooltipLabel}>
          <LibraryBooksIcon style={{color: this.state.selected ? 'white' : 'grey'}}/>
        </Tooltip>
      </ToggleButton>
      <Button id="settingsButton" onClick={this.handleClickSettings} style={{display: "none", marginTop: "15px"}}>
      <Tooltip TransitionComponent={Zoom} style={{fontFamily: '"Palatino Linotype", "Book Antiqua", Palatino, serif'}} title={"Choose which relationships to display"}>
      <AccountTreeIcon style={{color: '#adadad'}}/></Tooltip></Button>
        <Dialog
          open={this.state.openSettings}
          aria-labelledby="alert-dialog-title"
          aria-describedby="alert-dialog-description"
          onBackdropClick={this.handleCloseSettings}
          PaperProps={{
            style: {
              backgroundColor: '#222222',
            },
          }}
          >
          <DialogTitle id="alert-dialog-title"> <p style={{fontFamily: '"Palatino Linotype", "Book Antiqua", Palatino, serif', color: "white"}}>Choose which articles to show</p></DialogTitle>
          <DialogContent style={{fontFamily: '"Palatino Linotype", "Book Antiqua", Palatino, serif', color: "white"}}>
            <p style={{fontStyle: "italic", fontSize: "15px"}}>Warning: certain relationships return thousands of results, potentially overwhelming the browser</p><br/>
          <FormControl style={{fontFamily: '"Palatino Linotype", "Book Antiqua", Palatino, serif', color: "white"}}>
          <FormGroup>
          <FormControlLabel
            control={<Checkbox checked={this.state.checked.includes("parents")} onChange={() => this.handleCheckbox("parents", !this.state.checked.includes("parents"))}/>}
            label=<p style={{fontFamily: '"Palatino Linotype", "Book Antiqua", Palatino, serif'}}>Parents (the articles that the main article referenced)</p>
          />
          <FormControlLabel
            control={<Checkbox checked={this.state.checked.includes("grandparents")} onChange={() => this.handleCheckbox("grandparents", !this.state.checked.includes("grandparents"))} />}
            label=<p style={{fontFamily: '"Palatino Linotype", "Book Antiqua", Palatino, serif'}}>Grandparents (the articles that the parent articles referenced)</p>
          />
          <FormControlLabel
            control={<Checkbox checked={this.state.checked.includes("children")} onChange={() => this.handleCheckbox("children", !this.state.checked.includes("children"))} />}
            label=<p style={{fontFamily: '"Palatino Linotype", "Book Antiqua", Palatino, serif'}}>Children (the articles that cited the main article)</p>
          />
          <FormControlLabel
            control={<Checkbox checked={this.state.checked.includes("siblings")} onChange={() => this.handleCheckbox("siblings", !this.state.checked.includes("children"))} />}
            label=<p style={{fontFamily: '"Palatino Linotype", "Book Antiqua", Palatino, serif'}}>Siblings (the articles that also cited the parent articles)</p>
          />
          <FormControlLabel
            control={<Checkbox checked={this.state.checked.includes("grandchildren")} onChange={() => this.handleCheckbox("grandchildren", !this.state.checked.includes("grandchildren"))} />}
            label=<p style={{fontFamily: '"Palatino Linotype", "Book Antiqua", Palatino, serif'}}>Grandchildren (the articles that cited articles that cited the main article)</p>
          />
        </FormGroup>
          </FormControl>
          </DialogContent>
          </Dialog>
      <Button id="helpButton" onClick={this.handleClickOpen} style={{display: "none", marginTop: "15px"}}>
      <Tooltip TransitionComponent={Zoom} style={{fontFamily: '"Palatino Linotype", "Book Antiqua", Palatino, serif'}} title={"View Help"}>
      <HelpIcon style={{color: '#adadad'}}/></Tooltip></Button>
        <Dialog
          open={this.state.open}
          aria-labelledby="alert-dialog-title"
          aria-describedby="alert-dialog-description"
          onBackdropClick={this.handleClose}
          PaperProps={{
            style: {
              backgroundColor: '#222222',
            },
          }}
          >
          <DialogTitle id="alert-dialog-title"> <p style={{fontFamily: '"Palatino Linotype", "Book Antiqua", Palatino, serif', color: "white"}}>Help</p></DialogTitle>
          <DialogContent>
            <DialogContentText id="alert-dialog-description" style={{fontFamily: '"Palatino Linotype", "Book Antiqua", Palatino, serif', color: "white"}}>
              To zoom in and out, use scroll.<p/><br/>To pan around, click and drag the mouse.<p/><br/>
              To look at a paper's authors and year of publication, hover over the name.<p/><br/>
              To see the full paper, right-click on the article name.<p/><br/>
              To see abstracts, click on the book icon in the top bar, and hover over an article name (leaf nodes don't have abstracts parsed — to see those, either search from them, or right-click to go their link).<p/><br/>
              If the layout is messy, try changing the orientation and dragging some of the main nodes to reset their positions.
            </DialogContentText>
            <DialogActions>
              <Button onClick={this.handleClose} style={{fontFamily: '"Palatino Linotype", "Book Antiqua", Palatino, serif', color: "white", textTransform: "none", fontSize: "24px"}}>Go back</Button>
            </DialogActions>
          </DialogContent>
        </Dialog>
      <FormControl id="orientationButton" variant="outlined" label="Orientation" style={{color: "white", display: "none", marginTop: "15px"}}>
      <Select
          labelId="demo-simple-select-filled-label"
          id="demo-simple-select-filled"
          value={this.state.orientation}
          onChange={this.handleSelect}
          style={{fontFamily: '"Palatino Linotype", "Book Antiqua", Palatino, serif', marginTop: "15px", color: "white"}}
        >
          <MenuItem value={'lr'} style={{fontFamily: '"Palatino Linotype", "Book Antiqua", Palatino, serif'}}>Left-Right</MenuItem>
          <MenuItem value={'null'} style={{fontFamily: '"Palatino Linotype", "Book Antiqua", Palatino, serif'}}>Natural-Center</MenuItem>
          <MenuItem value={'radialin'} style={{fontFamily: '"Palatino Linotype", "Book Antiqua", Palatino, serif'}}>Radial In</MenuItem>
          <MenuItem value={'rl'} style={{fontFamily: '"Palatino Linotype", "Book Antiqua", Palatino, serif'}}>Right-Left</MenuItem>
          <MenuItem value={'radialout'} style={{fontFamily: '"Palatino Linotype", "Book Antiqua", Palatino, serif'}}>Radial Out</MenuItem>
          <MenuItem value={'bu'} style={{fontFamily: '"Palatino Linotype", "Book Antiqua", Palatino, serif'}}>Bottom Up</MenuItem>
          <MenuItem value={'td'} style={{fontFamily: '"Palatino Linotype", "Book Antiqua", Palatino, serif'}}>Top Down</MenuItem>
      </Select>
      </FormControl>
      <Button id="infoButton" onClick={this.handleClickAbout} style={{float: "inline-end"}}>
      <Tooltip TransitionComponent={Zoom} style={{fontFamily: '"Palatino Linotype", "Book Antiqua", Palatino, serif'}} title={"About"}>
      <InfoIcon style={{color: '#adadad'}}/></Tooltip></Button>
        <Dialog
          open={this.state.openAbout}
          aria-labelledby="alert-dialog-title"
          aria-describedby="alert-dialog-description"
          onBackdropClick={this.handleCloseAbout}
          PaperProps={{
            style: {
              backgroundColor: '#222222',
              width: '50%',
              maxWidth: 'none',
            },
          }}
          >
          <DialogTitle id="alert-dialog-title"> 
            <p style={{fontFamily: '"Palatino Linotype", "Book Antiqua", Palatino, serif', color: "white"}}>
            About
            </p>
          </DialogTitle>
          <DialogContent>
            <DialogContentText 
              id="alert-dialog-description" 
              style={{fontFamily: '"Palatino Linotype", "Book Antiqua", Palatino, serif', color: "white"}}>
              <h3 style={{fontSize: "18px"}}>This project:</h3>
              
              Although research papers have been around since the 17th century, the main method of exploring connected papers through 
              references and citations has fundamentally remained the same: copy article names from the bibliography, and search for them one by one. 
              This approach is incredibly slow, and although made more convenient through modern tools like Google Scholar, there is still no visualization, 
              and only the closest neighbors of an article are immediately accessible. <br/><br/>

              Norn Scholar aims to make research significantly faster and more pleasant by providing a graphical interface of papers, 
              from where the user can immediately see all the 
              papers referenced from an article, and right-click to go immediately read any one of them. Additionally, 
              the user can immediately see if certain grandparent papers are more influential than others in the field, and 
              how they may bridge different clusters of connected papers. <br/><br/>

              Available for direct reading are about 192 million papers, with millions more also indexed. <br/><br/>

              This project uses 
              <a href="https://www.semanticscholar.org?utm_source=api" 
                style={{
                  color: "#2222", 
                  fontSize: "30px", 
                  fontFamily: '"Roboto", sanserif', 
                  lineHeight: "1.4", 
                  background: "url('http://s2-public-api-prod.us-west-2.elasticbeanstalk.com/logo.svg') no-repeat"}}>
              Semantic Schi</a>
              API to collect information and links on research papers (including their citations & references) using various paper IDs. <br/><br/>
              Since there are many formats for cataloging research papers (DOI, ArXiv ID, S2 Paper ID, ACL ID), we have to infer the ID type
              from the input before making a call to Semantic Scholar. Additionally, if it is not an ID, we search arXiv through their API, return the first result, 
              and query that to Semantic Scholar (thank you to arXiv for use of its open access interoperability).

              <br/><br/>

              This project is still young, and new features are actively being added.<br/><br/>

              If you like this project and you wish to support it, you could buy me a coffee:<br/>
              
              <div style={{marginLeft: "32%", marginRight: "auto"}}>
              <a style={{ margin: "auto" }} class="bmc-button" target="_blank" href="https://www.buymeacoffee.com/ivovi">
              <img src="https://cdn.buymeacoffee.com/buttons/bmc-new-btn-logo.svg" alt="Buy me a coffee"/>
              <span style={{fontSize: "28px", lineHeight: "35px !important", fontFamily: '"Cookie", cursive !important'}}>Buy me a coffee</span></a>
              </div>

              <h3 style={{fontSize: "18px", marginTop: "40px"}}>Myself:</h3>
              <p style={{textAlign: "justify"}}>I’m a Software Engineer, musician, and my passion lies in interesting intersections between different fields. <br/><br/>
              Topics of interest include functional programming languages and practices, designing intelligent systems, and anything to do with the combination of music and programming. In my off-time, you can find me fencing or hiking. <br/><br/>
              "Code should be beautiful, correct, and built to last." <br/><br/>
              Feel free to write to me at <a href="mailto:ivan.viro1@gmail.com" style={{color: "#3ca0e7"}}>ivan.viro1@gmail.com</a>.
              </p>
              <img src="/mountain-background.jpg" style={{maxWidth: "750px", marginRight: "auto", marginLeft: "auto", width: "100%"}}/>

              <div class="effect thurio">
                <div class="buttons">
                  <a href="https://github.com/ivan-v/" class="github" title="Follow me on Github"><i class="fa fa-github" aria-hidden="true"/></a>
                  <a href="https://www.buymeacoffee.com/ivovi" class="coffee" title="Buy me a coffee"><i class="fa fa-coffee" aria-hidden="true"/></a>
                  <a href="https://www.youtube.com/c/IvanViro" class="youtube" title="Check out some of my videos"><i class="fa fa-youtube" aria-hidden="true"/></a>
                  <a href="mailto:ivan.viro1@gmail.com" class="email" title="Shoot me an email"><i class="fa fa-envelope" aria-hidden="true"/></a>
                  <a href="https://www.instagram.com/iv.o.vi/" class="insta" title="Look at some pretty pics"><i class="fa fa-instagram" aria-hidden="true"/></a>
                  <a href="https://www.linkedin.com/in/ivan-viro/" class="in" title="Connect with me on Linkedin"><i class="fa fa-linkedin" aria-hidden="true"/></a>
                </div>
              </div>
              </DialogContentText>
            <DialogActions>
              <Button onClick={this.handleCloseAbout} style={{fontFamily: '"Palatino Linotype", "Book Antiqua", Palatino, serif', color: "white", textTransform: "none", fontSize: "24px"}}>Go back</Button>
            </DialogActions>
          </DialogContent>
        </Dialog>
      <form noValidate autoComplete="off"> {
        this.state.loading?
        <LinearProgress variant="determinate" value={this.state.loadingProgress} style={{height: "7px"}} id="progressBar" />
        :
        <div></div> }
      </form>
        <form noValidate autoComplete="off">
          {
            this.state.inputLinkClicked?
            <div id="graphy">
              <ForceGraph2D
                graphData={this.state.nodesAndLinks}
                dagMode={this.state.orientation}
                onDagError={'() => pass;'}
                dagLevelDistance={20}
                linkColor={() => 'rgba(255,255,255,0.2)'}
                linkCurvature={0.07}
                linkDirectionalParticles={2}
                linkDirectionalParticleSpeed={(.0025)}
                linkDirectionalParticleColor={(link => highlightLinks.has(link) ? '#3379aa' : '#b0c4de' )}
                linkDirectionalParticleWidth={(link => highlightLinks.has(link) ? 6 : 3)}
                backgroundColor={'#101020'}
                d3AlphaDecay={0.02}
                d3VelocityDecay={.3}
                nodeAutoColorBy={"group"}
                nodeLabel={(node) => {
                  if (this.state.displayAbstract && node.abstract !== null && node.abstract !== undefined) {
                    return node.authors + ' ' + node.year + '\n<br><br>' + node.abstract;
                  } else {
                    return node.authors + ' ' + node.year;
                  }
                }}
                nodeCanvasObject={(node, ctx) => {
                  const label = node.name;
                  const fontSize = 2;
                  ctx.font = `${fontSize}px Sans-Serif`;
                  const textWidth = ctx.measureText(label).width;
                  const bckgDimensions = [textWidth, fontSize].map(n => n + fontSize * 0.8); // some padding

                  ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
                  ctx.fillRect(node.x - bckgDimensions[0] / 2, node.y - bckgDimensions[1] / 2, ...bckgDimensions);

                  ctx.textAlign = 'center';
                  ctx.textBaseline = 'middle';
                  ctx.fillStyle = node === hoverNode ? '#6eacbd' : '#4a90c2';
                  if (!(highlightNodes.has(node))) {
                    ctx.fillStyle = '#eeeeee';
                  }
                  ctx.fillText(label, node.x, node.y);
                }}

                d3Force={('collide', d3.forceCollide(13))}
                onNodeHover={(node => {
                  highlightNodes.clear();
                  highlightLinks.clear();
                  if (node) {
                    highlightNodes.add(node);
                    node.neighbors.forEach(neighbor => highlightNodes.add(neighbor));
                    node.links.forEach(link => highlightLinks.add(link));
                  }

                  hoverNode = node || null;
                  this.state.elem.style.cursor = node ? '-webkit-grab' : null;
                })}
                onNodeRightClick={(node, event) => {
                  window.open(node.link, "_blank");
                }}
              />
            </div>
            :
            <div></div>
          }
          </form>
    </div>
    );
  }
}

// export default App;
