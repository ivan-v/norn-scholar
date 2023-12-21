# Norn Scholar

In-browser tool for research, combining search with interactive graphical representation of research papers.

The first version of the project is ready; however, further developments are currently on hold.

Site version: https://www.nornscholar.com

![](screencapture.gif)

## Motivation
Although research papers have been around since the 17th century, the main method of exploring connected papers through references and citations has fundamentally remained the same: copy article names from the bibliography, and search for them one by one. This approach is incredibly slow, and although made more convenient through modern tools like Google Scholar, there is still no visualization, and only the closest neighbors of an article are immediately accessible.

Norn Scholar aims to make research significantly faster and more pleasant by providing a graphical interface of papers, from where the user can immediately see all the papers referenced from an article, and right-click to go immediately read any one of them. Additionally, the user can immediately see if certain grandparent papers are more influential than others in the field, and how they may bridge different clusters of connected papers.

## Name Meaning
The Norns in Norse mythology are three "maidens deep in knowledge" who rule the destiny of gods and men. They live by the lake under the world-tree Yggdrasil, watering it so that its branches do not rot. 

## APIs Used

To find research papers' authors, citations, references, and link by catalog ID
- Semantic Scholar API:
https://api.semanticscholar.org/

To find a research paper by keyword/name/author search:
- arXiv API:
https://arxiv.org/help/api/basics


## Libraries Used

### For Function

- React.js for building a modern web interface
https://reactjs.org/

- Vasco Asturiano's incredible force graph library    
    (which is itself built on d3.js https://d3js.org/)   
https://github.com/vasturiano/force-graph

### For Styling
- Material UI for a clean, minimalist design:
https://material-ui.com/

- Typist for fancy, dynamic text animation: 
https://github.com/jstejada/react-typist

- Some pretty icons (besides those from Material UI):
https://fontawesome.com/


## Future Work
- [ ] Add other API searches for research papers and journals (besides arXiv's):     
https://guides.lib.berkeley.edu/information-studies/apis    
- [ ] Add a mode to look at the intersection of common related articles when given several input articles
- [ ] Query all articles by a given author

 
## Author

**Ivan Viro**
