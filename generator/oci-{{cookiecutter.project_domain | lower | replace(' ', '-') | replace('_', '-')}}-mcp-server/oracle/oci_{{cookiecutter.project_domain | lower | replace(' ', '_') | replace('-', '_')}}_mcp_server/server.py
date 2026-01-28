"""
Copyright (c) {% now 'utc', '%Y' %}, Oracle and/or its affiliates.
Licensed under the Universal Permissive License v1.0 as shown at
https://oss.oracle.com/licenses/upl.
"""

"""oracle oci-{{cookiecutter.project_domain}} MCP Server implementation."""

import os
import oci

from logging import Logger
from mcp.server.fastmcp import FastMCP


from . import __project__, __version__

logger = Logger(__name__, level="INFO")

mcp = FastMCP(name=__project__, instructions='{{cookiecutter.instructions | replace('\'', '\'\'')}}')

def get_{{cookiecutter.project_domain | lower | replace(' ', '_') | replace('-', '_')}}_client():
    config = oci.config.from_file(
        profile_name=os.getenv("OCI_CONFIG_PROFILE", oci.config.DEFAULT_PROFILE)
    )
    user_agent_name = __project__.split("oracle.", 1)[1].split("-server", 1)[0]
    config["additional_user_agent"] = f"{user_agent_name}/{__version__}"
    private_key = oci.signer.load_private_key_from_file(config["key_file"])
    token_file = config["security_token_file"]
    token = None
    with open(token_file, "r") as f:
        token = f.read()
    signer = oci.auth.signers.SecurityTokenSigner(token, private_key)
    # Update this line to return the correct client
    return oci.core.{{cookiecutter.project_domain.capitalize()}}Client(config, signer=signer)

@mcp.tool(name='ExampleTool')
async def example_tool(
    query: str,
) -> str:
    """Example tool implementation.

    Replace this with your own tool implementation.
    """
    project_name = 'oracle {{cookiecutter.project_domain}} MCP Server'
    return (
        f"Hello from {project_name}! Your query was {query}. Replace this with your tool's logic"
    )

def main():
    """Run the MCP server with CLI argument support."""
    mcp.run()


if __name__ == '__main__':
    main()
