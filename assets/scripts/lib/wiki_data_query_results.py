from typing import List, Dict
from SPARQLWrapper import SPARQLWrapper, JSON

class WikiDataQueryResults:
    """
    A class that can be used to query data from Wikidata using SPARQL and return the results as a list of values for a specific key.
    """
    def __init__(self, query: str, user_agent: str):
        """
        Initializes the WikiDataQueryResults object with a SPARQL query string.

        :param query: A SPARQL query string.
        """
        self.user_agent = user_agent
        self.endpoint_url = "https://query.wikidata.org/sparql"
        self.sparql = SPARQLWrapper(self.endpoint_url, agent=self.user_agent)
        self.sparql.setQuery(query)
        self.sparql.setReturnFormat(JSON)

    def __transform2dicts(self, results: List[Dict]) -> List[Dict]:
        """
        Helper function to transform SPARQL query results into a list of dictionaries.

        :param results: A list of query results returned by SPARQLWrapper.
        :return: A list of dictionaries, where each dictionary represents a result row and has keys corresponding to the
        variables in the SPARQL SELECT clause.
        """
        new_results = []
        for result in results:
            new_result = {}
            for key in result:
                new_result[key] = result[key]['value']
            new_results.append(new_result)
        return new_results

    def load_as_dict(self) -> List[Dict]:
        """
        Loads the data from Wikidata using the SPARQLWrapper library, and transforms the results into
        a list of dictionaries.

        :return: A list of dictionaries, where each dictionary represents a result row and has keys corresponding to the
        variables in the SPARQL SELECT clause.
        """
        results = self.sparql.queryAndConvert()['results']['bindings']
        results = self.__transform2dicts(results)
        return results
