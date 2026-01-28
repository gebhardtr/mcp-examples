"""
Copyright (c) {% now 'utc', '%Y' %}, Oracle and/or its affiliates.
Licensed under the Universal Permissive License v1.0 as shown at
https://oss.oracle.com/licenses/upl.
"""


"""Tests for the oci-{{cookiecutter.project_domain}} MCP Server."""
from unittest.mock import MagicMock, create_autospec, patch

import oci
import pytest
from fastmcp import Client
from oracle.oci-{{cookiecutter.project_domain | lower | replace(' ', '_') | replace('-', '_')}}-mcp-server.server import mcp


class Test{{cookiecutter.project_domain | lower | replace(' ', '') | replace('-', '') | replace('_', '')}}Tools:
    @pytest.mark.asyncio
    @pytest.mark.skip(reason="Not implemented")
    def test_example_tool():
        # Arrange
        test_query = "test query"
        expected_project_name = "oracle oci-{{cookiecutter.project_domain}} MCP Server"
        expected_response = f"Hello from {expected_project_name}! Your query was {test_query}. Replace this with your tool's logic"

        # Act
        result = await example_tool(test_query)

        # Assert
        assert result == expected_response
